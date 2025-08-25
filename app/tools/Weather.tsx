export type WeatherProps = {
  temperature: number;
  location: string;
};

export const Weather = ({ temperature, location }: WeatherProps) => {
  return (
    <div>
      <h2>🌤️ Current Weather for {location}</h2>
      <p>🌡️ Temperature: {temperature}°C</p>
    </div>
  );
};
