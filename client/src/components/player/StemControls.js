import React from 'react';

const StemControls = ({ stemsConfig, toggleStem }) => {
  return (
    <div className="stem-controls">
      <h4>Stem Separation</h4>
      <div className="stem-buttons">
        <button
          onClick={() => toggleStem('vocals')}
          className={stemsConfig.vocals ? 'stem-btn active' : 'stem-btn'}
        >
          Vocals
        </button>
        <button
          onClick={() => toggleStem('drums')}
          className={stemsConfig.drums ? 'stem-btn active' : 'stem-btn'}
        >
          Drums
        </button>
        <button
          onClick={() => toggleStem('bass')}
          className={stemsConfig.bass ? 'stem-btn active' : 'stem-btn'}
        >
          Bass
        </button>
        <button
          onClick={() => toggleStem('other')}
          className={stemsConfig.other ? 'stem-btn active' : 'stem-btn'}
        >
          Other
        </button>
      </div>
    </div>
  );
};

export default StemControls;
