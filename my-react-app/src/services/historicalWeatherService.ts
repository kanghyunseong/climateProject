// 과거 기상 데이터 생성 및 분석 서비스
// 프론트엔드에서 과거 데이터를 시뮬레이션하여 기후 변화 분석에 사용

export interface HistoricalWeatherData {
  date: string; // YYYY-MM-DD
  temperature: number; // 기온 (°C)
  precipitation: number; // 강수량 (mm)
  humidity: number; // 습도 (%)
  windSpeed: number; // 풍속 (m/s)
  pm25?: number; // 미세먼지 (㎍/㎥)
}

export interface YearlySummary {
  year: number;
  avgTemperature: number;
  totalPrecipitation: number;
  avgHumidity: number;
  avgWindSpeed: number;
  extremeHeatDays: number; // 35°C 초과 일수
  extremeColdDays: number; // -15°C 미만 일수
  heavyRainDays: number; // 50mm 이상 강수 일수
}

// 과거 기상 데이터 생성 (시뮬레이션)
// 실제로는 API에서 가져와야 하지만, 프론트엔드 데모를 위해 시뮬레이션
export const generateHistoricalWeatherData = (
  startYear: number,
  endYear: number,
  _lat: number,
  _lng: number,
  baseTemperature: number = 20
): HistoricalWeatherData[] => {
  const data: HistoricalWeatherData[] = [];
  const startDate = new Date(startYear, 0, 1);
  const endDate = new Date(endYear, 11, 31);
  
  // 기후 변화 트렌드 (매년 0.05°C 상승)
  const temperatureTrend = (year: number) => {
    const yearsFromStart = year - startYear;
    return baseTemperature + yearsFromStart * 0.05;
  };

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
    
    // 계절성 반영 (사인파)
    const seasonalVariation = Math.sin((dayOfYear / 365) * Math.PI * 2) * 10;
    
    // 기온 계산 (기본값 + 계절성 + 트렌드 + 랜덤)
    const baseTemp = temperatureTrend(year);
    const temperature = baseTemp + seasonalVariation + (Math.random() - 0.5) * 8;
    
    // 강수량 (여름에 많음)
    const rainProbability = month >= 5 && month <= 8 ? 0.3 : 0.1;
    const precipitation = Math.random() < rainProbability 
      ? Math.random() * (month >= 5 && month <= 8 ? 50 : 20)
      : 0;
    
    // 습도 (계절성 반영)
    const humidity = 50 + seasonalVariation * 0.5 + (Math.random() - 0.5) * 20;
    
    // 풍속
    const windSpeed = 3 + Math.random() * 5 + Math.abs(seasonalVariation) * 0.2;
    
    // 미세먼지 (겨울에 높음)
    const pm25 = month >= 11 || month <= 2 
      ? 30 + Math.random() * 40 
      : 15 + Math.random() * 25;

    data.push({
      date: date.toISOString().split('T')[0],
      temperature: Math.round(temperature * 10) / 10,
      precipitation: Math.round(precipitation * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
      pm25: Math.round(pm25 * 10) / 10,
    });
  }

  return data;
};

// 연도별 요약 데이터 생성
export const generateYearlySummary = (
  data: HistoricalWeatherData[]
): YearlySummary[] => {
  const yearlyData = new Map<number, HistoricalWeatherData[]>();
  
  // 연도별로 그룹화
  data.forEach((item) => {
    const year = new Date(item.date).getFullYear();
    if (!yearlyData.has(year)) {
      yearlyData.set(year, []);
    }
    yearlyData.get(year)!.push(item);
  });

  const summaries: YearlySummary[] = [];

  yearlyData.forEach((yearData, year) => {
    const avgTemperature = yearData.reduce((sum, d) => sum + d.temperature, 0) / yearData.length;
    const totalPrecipitation = yearData.reduce((sum, d) => sum + d.precipitation, 0);
    const avgHumidity = yearData.reduce((sum, d) => sum + d.humidity, 0) / yearData.length;
    const avgWindSpeed = yearData.reduce((sum, d) => sum + d.windSpeed, 0) / yearData.length;
    
    const extremeHeatDays = yearData.filter(d => d.temperature > 35).length;
    const extremeColdDays = yearData.filter(d => d.temperature < -15).length;
    const heavyRainDays = yearData.filter(d => d.precipitation >= 50).length;

    summaries.push({
      year,
      avgTemperature: Math.round(avgTemperature * 10) / 10,
      totalPrecipitation: Math.round(totalPrecipitation * 10) / 10,
      avgHumidity: Math.round(avgHumidity * 10) / 10,
      avgWindSpeed: Math.round(avgWindSpeed * 10) / 10,
      extremeHeatDays,
      extremeColdDays,
      heavyRainDays,
    });
  });

  return summaries.sort((a, b) => a.year - b.year);
};

// 극단 기상 이벤트 탐지
export interface ExtremeEvent {
  date: string;
  type: 'heat' | 'cold' | 'heavyRain' | 'highWind';
  value: number;
  threshold: number;
}

export const detectExtremeEvents = (
  data: HistoricalWeatherData[],
  thresholds: {
    maxTemperature?: number; // 최고 기온 임계값
    minTemperature?: number; // 최저 기온 임계값
    maxPrecipitation?: number; // 최대 강수량 임계값
    maxWindSpeed?: number; // 최대 풍속 임계값
  }
): ExtremeEvent[] => {
  const events: ExtremeEvent[] = [];

  data.forEach((item) => {
    if (thresholds.maxTemperature && item.temperature > thresholds.maxTemperature) {
      events.push({
        date: item.date,
        type: 'heat',
        value: item.temperature,
        threshold: thresholds.maxTemperature,
      });
    }
    
    if (thresholds.minTemperature && item.temperature < thresholds.minTemperature) {
      events.push({
        date: item.date,
        type: 'cold',
        value: item.temperature,
        threshold: thresholds.minTemperature,
      });
    }
    
    if (thresholds.maxPrecipitation && item.precipitation > thresholds.maxPrecipitation) {
      events.push({
        date: item.date,
        type: 'heavyRain',
        value: item.precipitation,
        threshold: thresholds.maxPrecipitation,
      });
    }
    
    if (thresholds.maxWindSpeed && item.windSpeed > thresholds.maxWindSpeed) {
      events.push({
        date: item.date,
        type: 'highWind',
        value: item.windSpeed,
        threshold: thresholds.maxWindSpeed,
      });
    }
  });

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// 선형 회귀를 사용한 미래 트렌드 예측
export interface TrendPrediction {
  year: number;
  predictedTemperature: number;
  predictedPrecipitation: number;
}

export const predictFutureTrend = (
  yearlySummary: YearlySummary[],
  yearsAhead: number = 5
): TrendPrediction[] => {
  if (yearlySummary.length < 2) {
    return [];
  }

  // 선형 회귀 계산
  const n = yearlySummary.length;
  const years = yearlySummary.map(s => s.year);
  const temps = yearlySummary.map(s => s.avgTemperature);
  const precips = yearlySummary.map(s => s.totalPrecipitation);

  // 온도 선형 회귀
  const sumX = years.reduce((a, b) => a + b, 0);
  const sumY = temps.reduce((a, b) => a + b, 0);
  const sumXY = years.reduce((sum, x, i) => sum + x * temps[i], 0);
  const sumX2 = years.reduce((sum, x) => sum + x * x, 0);
  
  const tempSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const tempIntercept = (sumY - tempSlope * sumX) / n;

  // 강수량 선형 회귀
  const sumY2 = precips.reduce((a, b) => a + b, 0);
  const sumXY2 = years.reduce((sum, x, i) => sum + x * precips[i], 0);
  
  const precipSlope = (n * sumXY2 - sumX * sumY2) / (n * sumX2 - sumX * sumX);
  const precipIntercept = (sumY2 - precipSlope * sumX) / n;

  // 미래 예측
  const predictions: TrendPrediction[] = [];
  const lastYear = yearlySummary[yearlySummary.length - 1].year;

  for (let i = 1; i <= yearsAhead; i++) {
    const futureYear = lastYear + i;
    predictions.push({
      year: futureYear,
      predictedTemperature: Math.round((tempSlope * futureYear + tempIntercept) * 10) / 10,
      predictedPrecipitation: Math.round((precipSlope * futureYear + precipIntercept) * 10) / 10,
    });
  }

  return predictions;
};

