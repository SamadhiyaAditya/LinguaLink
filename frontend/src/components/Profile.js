import { useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import axios from "axios";

const Profile = ({ onClose }) => {
    const { authUser, setAuthUser } = useAuthContext();
    const [username, setUsername] = useState(authUser.username);
    const [nativeLanguage, setNativeLanguage] = useState(authUser.nativeLanguage);
    const [profilePic, setProfilePic] = useState(authUser.profilePic || "");
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.put("/users/update", { username, nativeLanguage, profilePic });
            setAuthUser(res.data);
            alert("Profile updated successfully!");
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
        }}>
            <div style={{
                background: "white",
                padding: "30px",
                borderRadius: "15px",
                width: "400px",
                maxWidth: "90%",
                boxShadow: "0 5px 15px rgba(0,0,0,0.3)"
            }}>
                <h2 style={{ marginBottom: "20px", color: "#FF7F50", textAlign: "center" }}>Edit Profile</h2>

                <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#555" }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "5px",
                                border: "1px solid #ddd"
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#555" }}>Profile Picture</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setProfilePic(reader.result);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "5px",
                                border: "1px solid #ddd"
                            }}
                        />
                        {profilePic && (
                            <div style={{ marginTop: "10px", textAlign: "center" }}>
                                <img src={profilePic} alt="Preview" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover" }} />
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", color: "#555" }}>Native Language</label>
                        <select
                            value={nativeLanguage}
                            onChange={(e) => setNativeLanguage(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "5px",
                                border: "1px solid #ddd"
                            }}
                        >
                            <option value="English">English</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Chinese">Chinese</option>
                            <option value="Japanese">Japanese</option>
                            <option value="Korean">Korean</option>
                            <option value="Italian">Italian</option>
                            <option value="Portuguese">Portuguese</option>
                            <option value="Russian">Russian</option>
                            <option value="Arabic">Arabic</option>
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: "10px",
                                background: "#ccc",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                color: "#333",
                                fontWeight: "bold"
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: "10px",
                                background: "#FF7F50",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                color: "white",
                                fontWeight: "bold"
                            }}
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
