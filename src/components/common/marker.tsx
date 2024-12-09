import Draggable from 'react-draggable';
import React from "react";
import { MARKER_DIAMETER } from "../../utils/constants";
import { useDispatch } from 'react-redux';
import { cornersSet } from '../../slices/cornersSlice';
import { CornersPayload, CornersKey } from '../../types';

const Marker = ({ name, xy }: { name: CornersKey, xy: number[] }) => {
  const boxStyle: React.CSSProperties = {
    "height": MARKER_DIAMETER,
    "width": MARKER_DIAMETER,
    "backgroundColor": "red",
    "borderRadius": "50%",
    "textAlign": "center",
    "position": "absolute",
    "userSelect": "none",
    "opacity": 0.5
  };
  const cursorStyle: React.CSSProperties = {
    "display": "flex",
    "height": "100%",
    "width": "100%",
    "textAlign": "center",
    "justifyContent": "center",
    "alignItems": "center"
  }
  const nodeRef = React.useRef(null);
  const dispatch = useDispatch();

  return (
    <Draggable
    handle="strong"
    bounds="parent"
    position={{"x": xy[0], "y": xy[1]}}
    defaultPosition={{"x": xy[0], "y": xy[1]}}
    nodeRef={nodeRef}
    onStop={(_, data) => {
      const payload: CornersPayload = {
        "xy": [data.x, data.y],
        "key": name
      }
      console.log(payload);
      dispatch(cornersSet(payload))
    }}
    >
      <div className="box no-cursor" style={boxStyle} ref={nodeRef}>
        <strong className="cursor" style={cursorStyle}>{name}</strong>
      </div>
    </Draggable>
  );
};

export default Marker;