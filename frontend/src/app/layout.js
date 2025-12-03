import { AuthContextProvider } from "../context/AuthContext";
import { SocketContextProvider } from "../context/SocketContext";
import "./globals.css";

export const metadata = {
  title: "LinguaLink",
  description: "AI-Powered Real-Time Multilingual Communication",
};

export const viewport = {
  themeColor: "#FFDAB9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthContextProvider>
          <SocketContextProvider>
            {children}
          </SocketContextProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
