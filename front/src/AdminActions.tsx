import React from "react";
import axios from "axios";

const AdminActions: React.FC = () => {
  const handleReset = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Unauthorized");

      await axios.delete("http://localhost:8080/reset", {
        headers: {
          "X-Authorization": `Bearer ${token}`,
        },
      });

      alert("Registry has been reset.");
    } catch (error) {
      console.error("Failed to reset registry:", error);
      alert("Failed to reset registry.");
    }
  };

  return <button onClick={handleReset}>Reset Registry</button>;
};

export default AdminActions;