/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                uno: {
                    red: '#ff5555',
                    blue: '#5555ff',
                    green: '#55aa55',
                    yellow: '#ffaa00',
                }
            }
        },
    },
    plugins: [],
}
