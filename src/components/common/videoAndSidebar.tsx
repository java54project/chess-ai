import { useRef, useState, useEffect } from "react"; // React hooks for managing state, side effects, and references
import Video from "../common/video"; // Core video processing and rendering component
import { useOutletContext } from "react-router-dom"; // Hook to access shared data via React Router
import { useDispatch } from 'react-redux'; // Hook to dispatch Redux actions
import { cornersReset, cornersSelect } from '../../slices/cornersSlice'; // Redux actions and selectors for managing corner state
import { Container } from "../common"; // Layout container for the UI
import LoadModels from "../../utils/loadModels"; // Utility to load AI models for piece detection
import { CornersDict, Mode, ModelRefs, Study } from "../../types"; // Type definitions for structured data
import RecordSidebar from "../record/recordSidebar"; // Sidebar component for "record" mode
import UploadSidebar from "../upload/uploadSidebar"; // Sidebar component for "upload" mode
import BroadcastSidebar from "../broadcast/broadcastSidebar"; // Sidebar component for "broadcast" mode
import { gameResetFen, gameResetMoves, gameResetStart, gameSelect } from "../../slices/gameSlice"; // Redux actions and selectors for managing game state
import { lichessPushRound } from "../../utils/lichess"; // Utility function to push game data to Lichess
import { userSelect } from "../../slices/userSlice"; // Selector for retrieving user information
import { START_FEN } from "../../utils/constants"; // Default starting position in FEN notation
import PlaySidebar from "../play/playSidebar"; // Sidebar component for "play" mode
import { useMediaQuery } from 'react-responsive'; // Hook for handling media queries (e.g., orientation)
import { pushDataToServer } from "../../utils/dataPush";

const PortraitWarning = () => {
  // Component to display a warning when the device is in portrait mode
  return (
    <h1 className="text-white text-center w-100 p-3 h-2">
      Please use your device in landscape mode
    </h1>
  );
};

const VideoAndSidebar = ({ mode }: { mode: Mode }) => {
  // Main component combining the video display and dynamic sidebar

  const context = useOutletContext<ModelRefs>(); // Access shared model references (e.g., AI models)
  const dispatch = useDispatch(); // Dispatch function for Redux actions
  const corners: CornersDict = cornersSelect(); // Retrieve current corner state from Redux
  const token: string = userSelect().token; // Get the user authentication token
  const moves: string = gameSelect().moves; // Get the current game moves from Redux
  const isPortrait = useMediaQuery({ orientation: 'portrait' }); // Check if the device is in portrait mode

  // State variables for managing component state
  const [text, setText] = useState<string[]>([]); // Informational text (e.g., FPS)
  const [playing, setPlaying] = useState<boolean>(false); // Video playback state
  const [study, setStudy] = useState<Study | null>(null); // State for managing Lichess studies
  const [boardNumber, setBoardNumber] = useState<number>(-1); // State for managing the chessboard number

  // References for DOM elements and state variables
  const videoRef = useRef<any>(null); // Reference for the video element
  const playingRef = useRef<boolean>(playing); // Reference for the playing state
  const canvasRef = useRef<any>(null); // Reference for the canvas element
  const sidebarRef = useRef<any>(null); // Reference for the sidebar container
  const cornersRef = useRef<CornersDict>(corners); // Reference for the corner state

  // Effect to handle broadcasting in "broadcast" mode
  useEffect(() => {
    if (mode !== "broadcast" || study === null || boardNumber === -1) {
      return; // Skip broadcasting if the mode or state is invalid
    }

    // Construct PGN (Portable Game Notation) for broadcasting
    const broadcastPgn = [
      `[Result "*"]`,
      `[FEN "${START_FEN}"]`,
      `[Board "${boardNumber}"]`,
      `[Site "${boardNumber}"]`,
      `[White "White ${boardNumber}"]`,
      `[Black "Black ${boardNumber}"]`,
      `[Annotator "Chess Academy"]`,
      "",
      moves,
    ].join("\r");

    lichessPushRound(token, broadcastPgn, study.id); // Push the PGN to Lichess

    // Prepare data for secure server push
    const payload = {
      gameId: `game-${boardNumber}`,
      moves: moves,
      timestamp: Date.now(),
    };
    
    // Push data securely to the server using the utility function
    pushDataToServer(payload);

  }, [moves]); // Effect runs when `moves` state changes

  // Effect to sync the playing state with its reference
  useEffect(() => {
    playingRef.current = playing; // Update the reference whenever `playing` changes
  }, [playing]);

  // Effect to sync the corners state with its reference
  useEffect(() => {
    cornersRef.current = corners; // Update the reference whenever `corners` changes
  }, [corners]);

  // Effect to initialize models and reset state on mount
  useEffect(() => {
    LoadModels(context.piecesModelRef, context.xcornersModelRef); // Load AI models
    dispatch(cornersReset()); // Reset corner state in Redux
    dispatch(gameResetStart()); // Reset game start state
    dispatch(gameResetMoves()); // Reset game moves
    dispatch(gameResetFen()); // Reset game FEN state
  }, []);

  // Props to be passed to the video and sidebar components
  const props = {
    playing,
    text,
    study,
    setPlaying,
    setText,
    setBoardNumber,
    setStudy,
    piecesModelRef: context.piecesModelRef,
    xcornersModelRef: context.xcornersModelRef,
    videoRef,
    canvasRef,
    sidebarRef,
    cornersRef,
    playingRef,
    mode,
  };

  // Function to render the appropriate sidebar based on the mode
  const Sidebar = () => {
    switch (mode) {
      case "record":
        return <RecordSidebar {...props} />; // Sidebar for recording games
      case "upload":
        return <UploadSidebar {...props} />; // Sidebar for uploading videos
      case "play":
        return <PlaySidebar {...props} />; // Sidebar for playing games
      case "broadcast":
        return <BroadcastSidebar {...props} />; // Sidebar for broadcasting games
    }
  };

  // Main component rendering logic
  return (
    <Container>
      {isPortrait ? ( // Check if the device is in portrait mode
        <PortraitWarning /> // Display a warning if in portrait mode
      ) : (
        <>
          {Sidebar()} {/* Render the dynamic sidebar */}
          <Video {...props} /> {/* Render the video processing component */}
        </>
      )}
    </Container>
  );
};

export default VideoAndSidebar; // Export the component for use in other parts of the app