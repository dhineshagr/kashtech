// src/pages/EmployeeDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import API from "../api/config";

const EmployeeDashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token"); // or sessionStorage, depending on your auth
        const res = await axios.get(API.GET_USER_PROFILE, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="text-center mt-20">
      {user ? (
        <>
          <h1 className="text-3xl font-bold text-purple-700">
            Welcome, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-4 text-gray-600">
            You can access your timesheets and reports here.
          </p>
        </>
      ) : (
        <p className="text-gray-500">Loading your dashboard...</p>
      )}
    </div>
  );
};

export default EmployeeDashboard;
