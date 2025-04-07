import { create } from 'zustand';
import { axiosInstance } from "../lib/axios";
import { toast } from "react-toastify";

export const useCapsulesStore = create((set) => ({
  capsules: [],
  isFetchingCapsules: false,
  isAddingCapsule: false,
  isUpdatingCapsule: false,
  isDeletingCapsule: false,

  getCapsules: async () => {
    set({ isFetchingCapsules: true });
    try {
      const response = await axiosInstance.get("/capsules", { withCredentials: true });
      console.log("Fetched Capsules:", response.data);  // Debug log

      // Log image/video URLs to check if they are correct
      response.data.forEach(capsule => {
        console.log("Images:", capsule.images);
        console.log("Videos:", capsule.videos);
      });

      set({ capsules: response.data, isFetchingCapsules: false });
      return response.data;
    } catch (error) {
      toast.error("Failed to fetch capsules", { autoClose: 1000 });
      console.error("Error fetching capsules:", error);
      set({ isFetchingCapsules: false });
      return false;
    }
  },

   createCapsule : async (formData) => {
    try {
      console.log("Sending capsule data:", formData);
  
      const response = await axiosInstance.post("/capsules", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
  
      console.log("Capsule created:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error adding capsule:", error.response?.data || error.message);
      return false;
    }
  },

  updateCapsule: async (id, updatedCapsule) => {
    set({ isUpdatingCapsule: true });
    try {
      const response = await axiosInstance.put(`/capsules/${id}`, updatedCapsule);
      set((state) => ({
        capsules: state.capsules.map((capsule) =>
          capsule._id === id ? response.data : capsule
        ),
      }));
      toast.success("Capsule updated successfully", { autoClose: 1000 });
    } catch (error) {
      console.error("Error updating capsule:", error);
      toast.error("Failed to update capsule", { autoClose: 1000 });
    } finally {
      set({ isUpdatingCapsule: false });
    }
  },

  deleteCapsule: async (id) => {
    set({ isDeletingCapsule: true });
    try {
      await axiosInstance.delete(`/capsules/${id}`);
      set((state) => ({
        capsules: state.capsules.filter((capsule) => capsule._id !== id),
      }));
      toast.success("Capsule deleted successfully", { autoClose: 1000 });
    } catch (error) {
      console.error("Error deleting capsule:", error);
      toast.error("Failed to delete capsule", { autoClose: 1000 });
    } finally {
      set({ isDeletingCapsule: false });
    }
  },
}));

export default useCapsulesStore;