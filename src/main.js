import { mount } from "svelte"; import "./app.css"; import App from "./App.svelte";
const target = document.getElementById("app"); target.innerHTML = ""; // the crawler prerender is replaced, not kept above the app
export default mount(App, { target });
