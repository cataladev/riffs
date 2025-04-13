"use client";

import { useRef, useEffect, useState } from 'react';
import FretboardOverlay from './FretboardOverlay';
import { useGameContext } from '../../context/GameContext';

export default function WebCam() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ correct: boolean; note: string } | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const { currentNote, checkNote, gameState, resetGame, startGame } = useGameContext();

    // Handle note feedback
    useEffect(() => {
        if (currentNote && gameState.status === 'playing') {
            // This would be replaced with actual note detection logic
            // For now, we'll simulate it with a button press
            const handleKeyPress = (e: KeyboardEvent) => {
                if (e.key === ' ') { // Space bar to simulate note detection
                    const isCorrect = checkNote(currentNote);
                    setFeedback({ correct: isCorrect, note: currentNote });
                    setShowFeedback(true);
                    
                    // Hide feedback after 1.5 seconds
                    setTimeout(() => {
                        setShowFeedback(false);
                    }, 1500);
                }
            };
            
            window.addEventListener('keydown', handleKeyPress);
            return () => window.removeEventListener('keydown', handleKeyPress);
        }
    }, [currentNote, checkNote, gameState.status]);

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                setIsLoading(true);
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    
                    // Wait for video metadata to load
                    await new Promise((resolve) => {
                        if (videoRef.current) {
                            videoRef.current.onloadedmetadata = resolve;
                        }
                    });
                    
                    // Start playing the video
                    await videoRef.current.play();
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error accessing camera:', err);
                setError('Failed to access camera. Please make sure you have granted camera permissions.');
                setIsLoading(false);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    if (error) {
        return (
            <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-red-500 text-center p-4">
                        <p>{error}</p>
                        <p className="text-sm mt-2">Please check your camera permissions and try again.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                    <div className="text-black text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                        <p className="mt-2">Starting camera...</p>
                    </div>
                </div>
            )}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute w-full h-full object-cover border-4 border-purple-700"
            />
            <FretboardOverlay />
            
            {/* Start game button - only show when game is idle */}
            
            {/* Note feedback overlay */}
            {showFeedback && feedback && (
                <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className={`text-6xl font-bold p-8 rounded-lg ${feedback.correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {feedback.correct ? '✓' : '✗'}
                    </div>
                </div>
            )}
            
            {/* Current note indicator */}
            {currentNote && gameState.status === 'playing' && (
                <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-70 text-white p-4 rounded-lg z-20">
                    <p className="text-xl font-bold">Play: {currentNote}</p>
                    <p className="text-sm mt-1">Press SPACE to simulate note detection</p>
                </div>
            )}
            
            {/* Game over screen */}
            {gameState.status === 'finished' && (
                <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-40">
                    <div className="bg-white p-8 rounded-lg max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
                        <div className="mb-6">
                            <p className="text-lg">Score: {gameState.score}</p>
                            <p className="text-lg">Correct: {gameState.correct}</p>
                            <p className="text-lg">Incorrect: {gameState.incorrect}</p>
                        </div>
                        <button 
                            onClick={resetGame}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
