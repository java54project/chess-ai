import { createSlice } from '@reduxjs/toolkit';
import { CornersDict, CornersPayload, RootState } from "../types";
import { useSelector } from 'react-redux';

const initialState: CornersDict = {"h1": [50, -100], "a1": [0, -100], "a8": [0, -150], "h8": [50, -150]}

interface Action {
  payload: CornersPayload,
  type: string
}

const cornersSlice = createSlice({
  name: 'corners',
  initialState,
  reducers: {
    cornersSet(state, action: Action) {
      state[action.payload.key] = action.payload.xy;
    },
    cornersReset() {
      return initialState
    }
  }
})

export const cornersSelect = () => {
  return useSelector((state: RootState) => state.corners)
}

export const { cornersSet, cornersReset } = cornersSlice.actions
export default cornersSlice.reducer