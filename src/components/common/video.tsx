import { findPieces } from "../../utils/findPieces"; // Function to detect chess pieces in video frames
import { useEffect, useRef } from "react"; // React hooks for managing side effects and references
import { CORNER_KEYS, MARKER_DIAMETER, MARKER_RADIUS, MEDIA_ASPECT_RATIO, MEDIA_CONSTRAINTS } from "../../utils/constants"; // Constants for UI and video settings
import { Corners } from "."; // Component to display detected chessboard corners
import { useWindowWidth, useWindowHeight } from '@react-hook/window-size'; // Hooks for dynamically getting window size
import { useDispatch } from 'react-redux'; // Hook for dispatching Redux actions
import { cornersSet } from "../../slices/cornersSlice"; // Redux action to update chessboard corner state
import { getMarkerXY, getXY } from "../../utils/detect"; // Utilities for handling marker positions and coordinates
import { CornersPayload, Game, Mode, MovesPair, SetBoolean, SetStringArray } from "../../types"; // Type definitions for the app
import { gameSelect, makeBoard } from "../../slices/gameSlice"; // Redux selectors and functions for managing chess game state
import { getMovesPairs } from "../../utils/moves"; // Utility to calculate valid moves based on chessboard state
import { Chess } from "chess.js"; // Library for chess game logic

// Main Video component to handle video playback, piece detection, and canvas rendering
const Video = ({ piecesModelRef, canvasRef, videoRef, sidebarRef, playing, 
  setPlaying, playingRef, setText, mode, cornersRef }: {
  piecesModelRef: any, canvasRef: any, videoRef: any, sidebarRef: any, 
  playing: boolean, setPlaying: SetBoolean, playingRef: any,
  setText: SetStringArray, mode: Mode,
  cornersRef: any
}) => {
  const game: Game = gameSelect(); // Select the current chess game state from Redux

  const displayRef = useRef<any>(null); // Reference for the display container
  const boardRef = useRef<Chess>(makeBoard(game)); // Reference to the Chess.js board instance
  const movesPairsRef = useRef<MovesPair[]>(getMovesPairs(boardRef.current)); // Reference for valid move pairs
  const lastMoveRef = useRef<string>(game.lastMove); // Reference for the last move
  const moveTextRef = useRef<string>(""); // Reference for the text representation of moves

  const windowWidth = useWindowWidth(); // Current window width
  const windowHeight = useWindowHeight(); // Current window height
  const dispatch = useDispatch(); // Dispatch function for Redux actions

  // Effect to update the chessboard state when the game state changes
  useEffect(() => {
    const board = makeBoard(game); // Initialize a new board based on the game state
    moveTextRef.current = getMoveText(board); // Update the textual representation of moves
    if (game.greedy === true) {
      board.undo(); // Undo the last move if the game is in "greedy" mode
    } else {
      movesPairsRef.current = getMovesPairs(board); // Calculate new move pairs
    }
    boardRef.current = board; // Update the board reference
    lastMoveRef.current = game.lastMove; // Update the last move reference
  }, [game]); // Runs whenever the `game` state changes

  // Function to convert chessboard moves into a human-readable text format
  const getMoveText = (board: Chess): string => {
    const history: string[] = board.history(); // Get the history of moves

    if (history.length === 0) {
      return ""; // No moves made
    }
    if (history.length === 1) {
      return `1. ${history[history.length - 1]}`; // First move
    }

    const firstMove = history[history.length - 2];
    const secondMove = history[history.length - 1];
    const nHalfMoves = Math.floor(history.length / 2);

    if (history.length % 2 === 0) {
      return `${nHalfMoves}.${firstMove} ${secondMove}`; // Even move count
    }
    return `${nHalfMoves}...${firstMove} ${nHalfMoves + 1}.${secondMove}`; // Odd move count
  };

  // Function to initialize the webcam and set the video source
  const setupWebcam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS); // Request webcam stream
    if (videoRef.current !== null) {
      videoRef.current.srcObject = stream; // Set the video element's source to the webcam stream
    }
    return stream; // Return the stream for later use
  };

  const awaitSetupWebcam = async () => {
    return setupWebcam(); // Wrapper to call the webcam setup function
  };

  // Function to update the dimensions of the video and canvas
  const updateWidthHeight = () => {
    let height = ((windowWidth - sidebarRef.current.offsetWidth - MARKER_DIAMETER) 
    / MEDIA_ASPECT_RATIO) + MARKER_DIAMETER;

    if (height > windowHeight) {
      height = windowHeight; // Ensure the height doesn't exceed the window height
    }

    if (canvasRef.current.offsetHeight === 0 || canvasRef.current.offsetWidth === 0) {
      return; // Skip updates if the canvas isn't visible
    }
    const width = ((height - MARKER_DIAMETER) * MEDIA_ASPECT_RATIO) + MARKER_DIAMETER;

    // Update the display and canvas dimensions
    displayRef.current.style.width = `${width}px`;
    displayRef.current.style.height = `${height}px`;
    canvasRef.current.width = videoRef.current.offsetWidth;
    canvasRef.current.height = videoRef.current.offsetHeight;

    // Update marker positions for the chessboard corners
    CORNER_KEYS.forEach((key) => {
      const xy = getXY(cornersRef.current[key], canvasRef.current.height, canvasRef.current.width);
      const payload: CornersPayload = {
        "xy": getMarkerXY(xy, canvasRef.current.height, canvasRef.current.width),
        "key": key
      };
      dispatch(cornersSet(payload)); // Dispatch updated corner positions to Redux
    });
  };

  // Effect to handle webcam setup and piece detection on component mount
  useEffect(() => {
    updateWidthHeight(); // Initial dimension updates

    let streamPromise: any = null;
    if (mode !== "upload") {
      streamPromise = awaitSetupWebcam(); // Set up the webcam if not in upload mode
    }

    findPieces(piecesModelRef, videoRef, canvasRef, playingRef, setText, dispatch, 
      cornersRef, boardRef, movesPairsRef, lastMoveRef, moveTextRef, mode); // Detect chess pieces

    // Cleanup function to stop the webcam stream
    const stopWebcam = async () => {
      const stream = await streamPromise;
      if (stream !== null) {
        stream.getTracks().forEach((track: any) => track.stop()); // Stop all webcam tracks
      }
    };

    return () => {
      stopWebcam(); // Clean up on component unmount
    };
  }, []); // Run once on mount

  // Effect to update dimensions when the window size changes
  useEffect(() => {
    updateWidthHeight();
  }, [windowWidth, windowHeight]);

  // Effect to control video playback based on the `playing` state
  useEffect(() => {
    if (mode !== "upload" || videoRef.current.src === "") {
      return;
    }

    if (playingRef.current === true) {
      videoRef.current.pause(); // Pause the video
    } else {
      videoRef.current.play(); // Play the video
    }
  }, [playing]);

  // CSS styles for canvas and video elements
  const canvasStyle: React.CSSProperties = {
    position: "absolute",
    left: MARKER_RADIUS,
    top: MARKER_RADIUS
  };

  const videoContainerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    padding: MARKER_RADIUS
  };

  const videoStyle: React.CSSProperties = {
    width: "auto",
    height: "100%"
  };

  const liveStyle: React.CSSProperties = {
    position: "relative",
    backgroundColor: "#343a40",
  };

  // Event handler for when video metadata is loaded
  const onLoadedMetadata = () => {  
    if (mode === "upload") {
      return;
    }
    window.setTimeout(() => {
      if (!videoRef.current) {
        return;
      }
      const tracks = videoRef.current.srcObject.getVideoTracks();
      if (tracks.length === 0) {
        return;
      }

      try {
        const capabilities = tracks[0].getCapabilities();
        if (capabilities.zoom) {
          tracks[0].applyConstraints({ zoom: capabilities.zoom.min }); // Adjust zoom if available
        }
      } catch (_) {
        console.log("Cannot update track capabilities");
      }

      try {
        const settings = tracks[0].getSettings(); // Log track settings
        console.log("Settings", settings);
      } catch (_) {
        console.log("Cannot log track settings");
      }
    }, 2000);
  };

  // Event handler for when the video is ready to play
  const onCanPlay = () => {
    updateWidthHeight();
  };

  // Event handler for when the video ends
  const onEnded = () => {
    if (mode === "upload") {
      videoRef.current.currentTime = videoRef.current.duration;
      videoRef.current.pause(); // Pause the video at the end
    }
    setPlaying(false); // Update the playing state
  };

  // Return the video and canvas elements, along with the Corners component
  return (
    <div className="d-flex align-top justify-content-center">
      <div ref={displayRef} style={liveStyle}>
        <div style={videoContainerStyle}>
          <video
            ref={videoRef}
            autoPlay={mode !== "upload"}
            playsInline={true}
            muted={true}
            onLoadedMetadata={onLoadedMetadata}
            style={videoStyle}
            onCanPlay={onCanPlay}
            onEnded={onEnded}
          />
          <canvas ref={canvasRef} style={canvasStyle} />
        </div>
        <Corners />
      </div>
    </div>
  );
};

export default Video;