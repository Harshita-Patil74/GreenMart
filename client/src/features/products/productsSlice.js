import { createSlice } from '@reduxjs/toolkit';
const s=createSlice({name:'products',initialState:{items:[],total:0},reducers:{setProducts:(st,a)=>{st.items=a.payload.items||a.payload;st.total=a.payload.total||0;}}});
export const {setProducts}=s.actions; export default s.reducer;
