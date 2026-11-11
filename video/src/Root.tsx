import { Composition } from "remotion";
import { GlanceIntro } from "./GlanceIntro";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GlanceIntro"
        component={GlanceIntro}
        durationInFrames={1440}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
