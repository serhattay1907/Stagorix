import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { focusSchema, SpeakerView } from "./common/views";

// The speaker fills the frame; `zoom` frames tighter around the face.
export const fullFaceSchema = z.object({ focus: focusSchema, zoom: z.number().min(1).max(2).default(1) });
export type FullFaceProps = z.input<typeof fullFaceSchema> & { speaker: React.ReactNode };

export const FullFace: React.FC<FullFaceProps> = ({ speaker, ...props }) => {
  const { focus, zoom } = fullFaceSchema.parse(props);
  return (
    <AbsoluteFill>
      <SpeakerView width={1080} height={1920} focus={focus} zoom={zoom}>
        {speaker}
      </SpeakerView>
    </AbsoluteFill>
  );
};
