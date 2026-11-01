import React from 'react';
import {parseMarkup} from '../lib/text';
import {C} from '../theme';

/** "*vurgu*" -> pembe, "**kalın**" -> kalın */
export const Rich: React.FC<{text: string; accent?: string; boldColor?: string}> = ({text, accent = C.pink, boldColor}) => (
  <>
    {parseMarkup(text).map((s, i) =>
      s.accent ? (
        <span key={i} style={{color: accent}}>
          {s.text}
        </span>
      ) : s.bold ? (
        <span key={i} style={{fontWeight: 900, color: boldColor}}>
          {s.text}
        </span>
      ) : (
        <React.Fragment key={i}>{s.text}</React.Fragment>
      ),
    )}
  </>
);
