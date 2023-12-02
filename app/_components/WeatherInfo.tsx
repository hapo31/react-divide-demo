import { cityWeather } from "@/src/store/weather";
import { useRecoilValue } from "recoil";
import Image from "next/image";

type Props = {
  cityId: string;
};

function Icon({ cityId }: Props) {
  const weather = useRecoilValue(cityWeather({ cityId }));

  const { image } = weather.forecasts[0];

  return (
    <Image
      src={image.url}
      alt={image.title}
      height={image.height}
      width={image.width}
    />
  );
}

function Description({ cityId }: Props) {
  const weather = useRecoilValue(cityWeather({ cityId }));

  return <div>{weather.description.text}</div>;
}

function City({ cityId }: Props) {
  const weather = useRecoilValue(cityWeather({ cityId }));

  return (
    <div>
      {weather.location.area}・{weather.location.district}
    </div>
  );
}

const exports = {
  Icon,
  Description,
  City,
};

export default exports;
