import { useEffect, useState } from "react";
import "./LoadingScreen.css";

export const LoadingScreen = ({ onComplete }) => {
  const [text, setText] = useState("");
  const fullText = "Loading...";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setText(fullText.substring(0, index));
      index++;

      if (index > fullText.length) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="loading-screen">
      {/* <div className="loading-text">
        {text}
      </div> */}
      <div className="loading-bar-container">
        <div className="loading-bar"></div>
      </div>
    </div>
  );
};
