import { axiosInstance } from "../lib/axios";
import { create } from "zustand";
import { toast } from "react-toastify";

export const useProfileStore = create((set) => ({
  // State for the user's profile and leaderboard
  profile: null,
  leaderboard: [],
  isFetchingProfile: false,
  isUpdatingProfile: false,
  isFetchingLeaderboard: false,
  isUpdatingLeaderboard: false,
  
  fetchProfile: async () => {
    set({ isFetchingProfile: true });
    try {
      const res = await axiosInstance.get("/profile");
      set({ profile: res.data });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to fetch profile");
    } finally {
      set({ isFetchingProfile: false });
    }
  },

  // Update the user's profile stats.
  updateProfile: async (formData) => {
    set({ isUpdatingProfile: true });
  
    try {
      const res = await axiosInstance.patch('/profile/update', formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true, // ✅ Ensure cookies are sent
      });
  
      set({ profile: res.data });
      toast.success('Profile updated successfully!', { autoClose: 1000 });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile', { autoClose: 1000 });
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
  

  // Fetch the leaderboard.
  // Expected API response returns an array where each entry includes:
  // fullName, TimeCapsuleCount, FriendsCount, and SharedCapsuleCount.
  fetchLeaderboard: async () => {
    set({ isFetchingLeaderboard: true });
    try {
      const res = await axiosInstance.get("/profile/leaderboard");
      console.log("Fetched leaderboard data:", res.data);

      if (!res.data || !Array.isArray(res.data)) {
        throw new Error("Invalid leaderboard data format.");
      }

      const transformedLeaderboard = res.data.map((entry, index) => ({
        id: `player-${index}`,
        Username: entry.fullName, // from the DB
        TimeCapsuleCount: entry.TimeCapsuleCount,
        FriendsCount: entry.FriendsCount,
        SharedCapsuleCount: entry.SharedCapsuleCount,
      }));

      set({ leaderboard: transformedLeaderboard });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error(error.response?.data?.error || "Failed to fetch leaderboard");
    } finally {
      set({ isFetchingLeaderboard: false });
    }
  },

  // Update the leaderboard stats.
  updateLeaderboard: async (updateData) => {
    set({ isUpdatingLeaderboard: true });
    try {
      const res = await axiosInstance.patch("/profile/leaderboard", updateData);
      // Optionally update local leaderboard state if the API returns updated data.
    } catch (error) {
      console.error("Error updating leaderboard:", error);
      toast.error("Failed to update leaderboard");
    } finally {
      set({ isUpdatingLeaderboard: false });
    }
  },
}));
