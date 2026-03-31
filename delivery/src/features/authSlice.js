import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  deliveryPartner: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    userLoggedIn: (state, action) => {
      state.deliveryPartner = action.payload.deliveryPartner;
      state.isAuthenticated = true;
    },
    userLoggedOut: (state) => {
      state.deliveryPartner = null;
      state.isAuthenticated = false;
    },
  },
});

export const { userLoggedIn, userLoggedOut } = authSlice.actions;

export default authSlice.reducer;
