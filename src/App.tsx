import { Dispatch, useEffect, useRef, useState } from "react"; 
// React hooks for state management, side-effects, and references
import { NavigateFunction, Outlet, useNavigate } from "react-router-dom"; 
// React Router for navigation and nested routing
import { GraphModel } from "@tensorflow/tfjs-converter"; 
// TensorFlow.js GraphModel type for loading machine learning models
import "@tensorflow/tfjs-backend-webgl"; 
// TensorFlow.js backend for GPU acceleration
import { ModelRefs } from "./types"; 
// Type definitions for model references
import { userSelect } from "./slices/userSlice"; 
// Redux selector to access user state
import { useDispatch } from "react-redux"; 
// Redux hook to dispatch actions
import { lichessTrySetUser } from "./utils/lichess"; 
// Utility to authenticate or set user via Lichess
import { AnyAction } from "redux"; 
// Redux type for generic actions

// Main App component responsible for global initialization and routing
const App = () => {
  const dispatch: Dispatch<AnyAction> = useDispatch(); 
  // Dispatch function for triggering Redux actions
  const navigate: NavigateFunction = useNavigate(); 
  // Function for programmatic navigation within the app
  const token = userSelect().token; 
  // Extract the user token from Redux state
  const [loading, setLoading] = useState(true); 
  // State variable to manage the loading status of the app
  
  const piecesModelRef = useRef<GraphModel>(); 
  // Reference for the TensorFlow model used for chess piece detection
  const xcornersModelRef = useRef<GraphModel>(); 
  // Reference for the TensorFlow model used for chessboard corner detection
  const modelRefs: ModelRefs = {
    "piecesModelRef": piecesModelRef, // Map the pieces model reference
    "xcornersModelRef": xcornersModelRef, // Map the corners model reference
  };

  useEffect(() => {
    // Run on component mount
    if (token === "") {
      // If no user token is present, attempt to set the user via Lichess
      lichessTrySetUser(navigate, dispatch);
    }
    setLoading(false); // Mark the app as finished loading
  }, []); 
  // Empty dependency array ensures this runs only once after the component mounts

  return (
    <>
      {/* Render nested routes only after loading is complete */}
      {!loading && <Outlet context={modelRefs}/>}
      {/* Pass the TensorFlow model references as context to child components */}
    </>
  );
};

export default App; 
// Export the App component for use in the main application