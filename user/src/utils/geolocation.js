const DEFAULT_LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 22000,
  maximumAge: 0,
};

const DEFAULT_BEST_SAMPLE_CONFIG = {
  targetAccuracy: 120,
  acceptableAccuracy: 1200,
  hardRejectAccuracy: 10000,
  maxWaitMs: 18000,
  maxSamples: 8,
};

const normalizePosition = (position) => ({
  latitude: Number(position.coords.latitude.toFixed(6)),
  longitude: Number(position.coords.longitude.toFixed(6)),
  accuracy: Number(position.coords.accuracy || 0),
});

const isBetterSample = (nextSample, currentSample) => {
  if (!currentSample) return true;
  if (nextSample.accuracy <= 0) return false;
  if (currentSample.accuracy <= 0) return true;

  return nextSample.accuracy < currentSample.accuracy;
};

export const getBestCurrentLocation = (config = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    const settings = { ...DEFAULT_BEST_SAMPLE_CONFIG, ...config };
    let watchId = null;
    let timeoutId = null;
    let bestSample = null;
    let settled = false;
    let sampleCount = 0;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };

    const finalizeWithBestSample = () => {
      if (settled) return;
      settled = true;
      cleanup();

      if (!bestSample) {
        const error = new Error("Current location detect nahi ho pa rahi.");
        error.code = 2;
        reject(error);
        return;
      }

      if (bestSample.accuracy > settings.acceptableAccuracy) {
        const error = new Error(
          `Current location accurate nahi mili. GPS accuracy ${Math.round(
            bestSample.accuracy
          )} m hai, precise location on karke phir try karo.`
        );
        error.code = 3;
        error.accuracy = bestSample.accuracy;
        error.bestSample = bestSample;
        reject(error);
        return;
      }

      resolve(bestSample);
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        sampleCount += 1;
        const sample = normalizePosition(position);

        if (isBetterSample(sample, bestSample)) {
          bestSample = sample;
        }

        if (sample.accuracy <= settings.targetAccuracy) {
          if (!settled) {
            settled = true;
            cleanup();
            resolve(sample);
          }
          return;
        }

        if (sampleCount >= settings.maxSamples) {
          finalizeWithBestSample();
        }
      },
      (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      },
      DEFAULT_LOCATION_OPTIONS
    );

    timeoutId = window.setTimeout(() => {
      finalizeWithBestSample();
    }, settings.maxWaitMs);
  });

