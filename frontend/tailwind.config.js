export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        SMSBlue: "#005f73",
        SMSCoral: "#ee9b00",
        SMSCream: "#fefae0",
        SMSInk: "#1d3557"
      },
      fontFamily: {
        heading: ["Poppins", "Segoe UI", "sans-serif"],
        body: ["Manrope", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        panel: "0 20px 60px rgba(10, 40, 80, 0.12)"
      }
    }
  },
  plugins: []
};
