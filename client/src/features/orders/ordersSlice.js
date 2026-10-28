import { createSlice } from '@reduxjs/toolkit';
const s=createSlice({name:'orders',initialState:{items:[]},reducers:{setOrders:(st,a)=>{st.items=a.payload;}}});
export const {setOrders}=s.actions; export default s.reducer;
