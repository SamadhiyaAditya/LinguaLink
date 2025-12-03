"use client";
import { useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useRouter } from "next/navigation";

const Login = () => {
    const { login, signup } = useAuthContext();
    const router = useRouter();

    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        nativeLanguage: "English"
    });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            if (isLogin) {
                await login(formData.username, formData.password);
            } else {
                await signup(formData);
            }
            router.push("/chat");
        } catch (error) {
            setError(error.message || "An error occurred");
        }
    };

    return (
        <div style={{
            width: "100%",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--brand-gradient)"
        }}>
            <div style={{
                background: "rgba(255, 255, 255, 0.95)",
                padding: "2.5rem",
                borderRadius: "20px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                width: "400px",
                maxWidth: "90%",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)"
            }}>
                <h1 style={{
                    textAlign: "center",
                    marginBottom: "2rem",
                    background: "var(--brand-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontSize: "2.5rem",
                    fontWeight: "bold"
                }}>
                    LinguaLink
                </h1>

                {error && (
                    <div style={{
                        background: "#ffebee",
                        color: "#c62828",
                        padding: "10px",
                        borderRadius: "5px",
                        marginBottom: "1rem",
                        textAlign: "center",
                        fontSize: "0.9rem"
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        style={inputStyle}
                    />
                    {!isLogin && (
                        <>
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                style={inputStyle}
                            />
                            <select
                                name="nativeLanguage"
                                value={formData.nativeLanguage}
                                onChange={handleChange}
                                style={inputStyle}
                            >
                                <option value="English">English</option>
                                <option value="Spanish">Spanish</option>
                                <option value="French">French</option>
                                <option value="Japanese">Japanese</option>
                                <option value="Hindi">Hindi</option>
                            </select>
                        </>
                    )}
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        style={inputStyle}
                    />
                    {!isLogin && (
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            style={inputStyle}
                        />
                    )}
                    <button type="submit" className="hover-scale" style={{
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: "var(--brand-gradient)",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        cursor: "pointer",
                        marginTop: "1rem",
                        boxShadow: "0 4px 15px rgba(255, 121, 68, 0.3)"
                    }}>
                        {isLogin ? "Login" : "Sign Up"}
                    </button>
                </form>
                <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem", color: "#666" }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ color: "#ff7944", cursor: "pointer", fontWeight: "bold" }}
                    >
                        {isLogin ? "Sign Up" : "Login"}
                    </span>
                </p>
            </div>
        </div>
    );
};

const inputStyle = {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #FFCC99",
    background: "#FFF5EE", // Seashell
    fontSize: "1rem",
    outline: "none"
};

export default Login;
