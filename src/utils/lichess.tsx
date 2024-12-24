import { AccessContext, OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce'; // Importing OAuth library for Lichess integration
import { userReset, userSetToken, userSetUsername } from '../slices/userSlice'; // Redux actions to manage user state
import { Dispatch } from 'react'; // Type definition for React dispatch
import { AnyAction } from 'redux'; // Redux type for any action
import { NavigateFunction } from 'react-router-dom'; // Type for navigation functions
import { Study } from '../types'; // Type definition for Study

// Lichess API base URL and configuration
const lichessHost = 'https://lichess.org'; // Base URL for Lichess API
const scopes = ["study:write", "study:read", "challenge:read", "bot:play", "board:play"]; // Scopes required for OAuth
const clientId = 'lichess-api-demo'; // Client ID for the application
const clientUrl = `${location.protocol}//${location.host}/`; // Redirect URL for the application

// Initializes the OAuth client for authorization
const getOauth = () => {
  const oauth: OAuth2AuthCodePKCE = new OAuth2AuthCodePKCE({
    authorizationUrl: `${lichessHost}/oauth`, // Authorization endpoint
    tokenUrl: `${lichessHost}/api/token`, // Token exchange endpoint
    clientId, // Client ID for the app
    scopes, // Permissions requested from Lichess
    redirectUrl: clientUrl, // Redirect URL after authentication
    onAccessTokenExpiry: refreshAccessToken => refreshAccessToken(), // Automatically refresh token on expiry
    onInvalidGrant: console.warn, // Log warnings for invalid grants
  });
  return oauth;
}

// Reads and processes streaming API responses line by line
const readStream = (processLine: any) => (response: any) => {
  const stream = response.body.getReader(); // Access response body as a stream
  const matcher = /\r?\n/; // Matches line breaks
  const decoder = new TextDecoder(); // Decodes streamed text
  let buf: any = ''; // Buffer for incomplete data chunks

  // Continuously reads from the stream
  const loop = () =>
    stream.read().then(({ done, value }: {done: boolean, value: any}) => {
      if (done) {
        if (buf.length > 0) processLine(JSON.parse(buf)); // Process remaining data when stream ends
      } else {
        const chunk = decoder.decode(value, { stream: true }); // Decode incoming data
        buf += chunk; // Append to buffer

        const parts = buf.split(matcher); // Split complete lines
        buf = parts.pop(); // Save incomplete line in buffer
        for (const i of parts.filter((p: any) => p)) processLine(JSON.parse(i)); // Process complete lines
        return loop(); // Continue reading
      }
    });

  return loop();
}

// Fetches the JSON body from a Lichess API response
const fetchBody = async (token: string, path: string, options: any = {}) => {
  const res: any = await fetchResponse(token, path, options); // Fetches raw response
  const body: any = await res.json(); // Parses JSON from the response
  return body;
}

// Fetches a response from Lichess API with error handling
const fetchResponse = async (token: string, path: string, options: any = {}) => {
  const config: any = {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`, // Sets Bearer token for authentication
    },
  };
  const res: any = await window.fetch(`${lichessHost}${path}`, config); // Fetch request
  if (!res.ok) {
    const err = `${res.status} ${res.statusText}`; // Handles non-200 responses
    alert(err); // Alerts the error
    throw err; // Throws error for further handling
  }
  return res;
};

// Fetches studies not linked to broadcasts for a user
const setBroadcastlessStudies = async (token: string, username: string, setStudies: any, broadcasts: any) => {
  const path = `/api/study/by/${username}`; // API endpoint for user studies

  const broadcastIds = broadcasts.map((x: any) => x.id); // Extracts IDs of broadcast studies

  const studies: Study[] = [];
  fetchResponse(token, path)
  .then(readStream(async (response: any) => {
    const id_ = response.id;
    if (!(broadcastIds.includes(id_))) { // Filters studies not in broadcasts
      studies.push({
        "id": id_, 
        "name": response.name
      });
    }
  }))
  .then(() => setStudies(studies)); // Updates studies state
}

// Starts the OAuth login process
export const lichessLogin = () => {
  const oauth = getOauth(); // Initializes OAuth client
  oauth.fetchAuthorizationCode(); // Starts authorization flow
}

// Logs the user out and resets the application state
export const lichessLogout = (dispatch: Dispatch<AnyAction>) => {
  localStorage.removeItem("oauth2authcodepkce-state"); // Clears local storage
  dispatch(userReset()); // Resets Redux user state
}

// Fetches account details of the authenticated user
export const lichessGetAccount = (token: string) => {
  const path = "/api/account"; // API endpoint for user account
  const account = fetchBody(token, path); // Fetches account details
  return account;
}

// Fetches and sets studies or broadcasts for a user
export const lichessSetStudies = (token: string, setStudies: any, username: string, onlyBroadcasts: boolean) => {
  const path = `/api/broadcast/my-rounds`; // API endpoint for broadcasts
  const broadcasts: Study[] = [];
  fetchResponse(token, path)
  .then(readStream(async (response: any) => {
    broadcasts.push({
      "id": response.round.id, 
      "name": response.round.name
    });
  }))
  .then(() => {
    if (onlyBroadcasts) {
      setStudies(broadcasts); // Sets broadcasts if only broadcasts are required
    } else {
      setBroadcastlessStudies(token, username, setStudies, broadcasts); // Sets other studies
    }
  });
}

// Imports a PGN to Lichess
export const lichessImportPgn = (token: string, pgn: string) => {
  const path = "/api/import"; // API endpoint for PGN import
  const options = {
    body: new URLSearchParams({ pgn }), 
    method: "POST"
  };
  const data = fetchBody(token, path, options); // Sends PGN data
  return data;
}

// Imports a PGN into a specific study
export const lichessImportPgnToStudy = (token: string, pgn: string, name: string, studyId: string) => {
  const path = `/api/study/${studyId}/import-pgn`; // API endpoint for importing PGN into a study
  const options = {
    body: new URLSearchParams({ pgn: pgn, name: name }), 
    method: "POST"
  };
  fetchResponse(token, path, options); // Sends PGN data with study details
}

// Pushes a PGN to a broadcast round
export const lichessPushRound = (token: string, pgn: string, roundId: string) => {
  const path = `/api/broadcast/round/${roundId}/push`; // API endpoint for pushing PGN to a round
  const options = {
    body: pgn,
    method: "POST"
  };
  fetchResponse(token, path, options); // Sends PGN data
}

// Streams game updates from Lichess
export const lichessStreamGame = (token: string, callback: any, gameId: string) => {
  const path = `/api/board/game/stream/${gameId}`; // API endpoint for game stream
  fetchResponse(token, path)
  .then(readStream(callback)); // Processes streamed data
}

// Fetches ongoing games for the authenticated user
export const lichessGetPlaying = (token: string) => {
  const path = "/api/account/playing"; // API endpoint for playing games
  const playing = fetchBody(token, path); // Fetches data
  return playing;
}

// Sends a move to Lichess in a live game
export const lichessPlayMove = (token: string, gameId: string, move: string) => {
  const path = `/api/board/game/${gameId}/move/${move}`; // API endpoint for playing a move
  const options = {
    method: "POST"
  };
  fetchResponse(token, path, options); // Sends move data
}

// Tries to set the user state after OAuth login
export const lichessTrySetUser = async (navigate: NavigateFunction, dispatch: Dispatch<AnyAction>) => {
  const oauth: OAuth2AuthCodePKCE = getOauth(); // Initializes OAuth client
  const returning: boolean = await oauth.isReturningFromAuthServer(); // Checks if returning from auth
  if (!returning) {
    return;
  }

  const accessContext: AccessContext = await oauth.getAccessToken(); // Gets access token
  const newToken: string | undefined = accessContext?.token?.value; // Extracts token value
  if (newToken === undefined) {
    console.log("Access Context token is undefined");
    return;
  }
  
  dispatch(userSetToken(newToken)); // Updates Redux with the token

  const account: any = await lichessGetAccount(newToken); // Fetches user account details
  const username: string = account.username;
  dispatch(userSetUsername(username)); // Updates Redux with the username
  
  navigate("/"); // Redirects to the home page
}