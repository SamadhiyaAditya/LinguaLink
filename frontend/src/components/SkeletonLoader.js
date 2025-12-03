import React from 'react';

const SkeletonLoader = ({ type = "text", count = 1, style = {} }) => {
    const skeletons = Array(count).fill(0);

    return (
        <div style={{ width: "100%", ...style }}>
            {skeletons.map((_, index) => (
                <div
                    key={index}
                    className={`skeleton ${type}`}
                    style={{
                        backgroundColor: "#eee",
                        backgroundImage: "linear-gradient(90deg, #eee, #f5f5f5, #eee)",
                        backgroundSize: "200px 100%",
                        backgroundRepeat: "no-repeat",
                        borderRadius: "4px",
                        marginBottom: "8px",
                        animation: "skeleton-loading 1.5s infinite ease-in-out",
                        ...getStyleForType(type)
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes skeleton-loading {
                    0% { background-position: -200px 0; }
                    100% { background-position: calc(200px + 100%) 0; }
                }
            `}</style>
        </div>
    );
};

const getStyleForType = (type) => {
    switch (type) {
        case "avatar":
            return { width: "40px", height: "40px", borderRadius: "50%" };
        case "text":
            return { width: "100%", height: "16px" };
        case "title":
            return { width: "60%", height: "24px", marginBottom: "12px" };
        case "chat-bubble-left":
            return { width: "40%", height: "40px", borderRadius: "10px 10px 10px 0", alignSelf: "flex-start", marginBottom: "10px" };
        case "chat-bubble-right":
            return { width: "40%", height: "40px", borderRadius: "10px 10px 0 10px", alignSelf: "flex-end", marginLeft: "auto", marginBottom: "10px" };
        default:
            return {};
    }
};

export default SkeletonLoader;
