const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

// Keep local development and builds without a valid GA4 ID free of tracking.
if (import.meta.env.PROD && measurementId && /^G-[A-Z0-9]+$/.test(measurementId)) {
	window.dataLayer = window.dataLayer || [];
	window.gtag = function () {
		window.dataLayer.push(arguments);
	};

	window.gtag('js', new Date());
	window.gtag('config', measurementId);

	const script = document.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
	document.head.append(script);
}
