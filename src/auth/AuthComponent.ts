/* eslint-disable @typescript-eslint/no-explicit-any */
import MultiContextObject from "../core/MultiContextObject"; // Adjusted path
import { NetworkManager } from "../managers/NetworkManager"; // Adjusted path
import ObjectManager from "../managers/ObjectManager"; // Adjusted path
import GunDataProvider from "../data-providers/GunDataProvider"; // Adjusted path
import Gun from "gun"; // Import Gun

// Create a local Gun instance for this component's scope
const localGunInstance = Gun({ /* Add any default options if needed, e.g., peers: [] */ });
const dataProvider = new GunDataProvider(localGunInstance);
const networkManager = NetworkManager.newInstance(dataProvider);
const objectManager = ObjectManager.newInstance(dataProvider); // Assuming ObjectManager also needs provider


function createMultiContextObject(id: string, type: string, contexts: any[], provider: any) {
  return new MultiContextObject(id, type, contexts, provider, networkManager, objectManager);
}

class AuthComponent extends HTMLElement {
  authObject: any;
  isLoggedIn: boolean;


  constructor() {
    super();
    this.authObject = createMultiContextObject('auth', 'AuthObject', [
      { name: 'browser', version: '1.0' },
      { name: 'server', version: '1.0' },
      { name: 'auth', version: '1.0' }
    ], dataProvider);

    this.isLoggedIn = false;
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.checkAuthStatus();
  }

  async checkAuthStatus() {
    this.isLoggedIn = await this.authObject.getProxy().checkAuthStatus();
    this.updateAuthUI();
  }

  render() {
    if(!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
        .modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 500px; }
        .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
        .close:hover { color: black; }
        button { margin: 5px; padding: 10px; cursor: pointer; }
        input { margin: 5px; padding: 5px; }
      </style>
      <div>
        <button id="loginButton">Login</button>
        <button id="registerButton">Register</button>
        <button id="logoutButton" style="display: none;">Logout</button>
      </div>
      <div id="loginModal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Login</h2>
          <form id="loginForm">
            <input type="text" id="loginUsername" placeholder="Username" required>
            <input type="password" id="loginPassword" placeholder="Password" required>
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
      <div id="registerModal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Register</h2>
          <form id="registerForm">
            <input type="text" id="registerUsername" placeholder="Username" required>
            <input type="password" id="registerPassword" placeholder="Password" required>
            <input type="password" id="confirmPassword" placeholder="Confirm Password" required>
            <button type="submit">Register</button>
          </form>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const tsr = (this.shadowRoot as any);
    const loginButton = tsr.getElementById('loginButton');
    const registerButton = tsr.getElementById('registerButton');
    const logoutButton = tsr.getElementById('logoutButton');
    const loginModal = tsr.getElementById('loginModal');
    const registerModal = tsr.getElementById('registerModal');
    const loginForm = tsr.getElementById('loginForm');
    const registerForm = tsr.getElementById('registerForm');
    const closeButtons = tsr.querySelectorAll('.close');

    loginButton.addEventListener('click', () => loginModal.style.display = 'block');
    registerButton.addEventListener('click', () => registerModal.style.display = 'block');
    logoutButton.addEventListener('click', () => this.handleLogout());

    loginForm.addEventListener('submit', (e: any) => this.handleLogin(e));
    registerForm.addEventListener('submit', (e: any) => this.handleRegister(e));

    closeButtons.forEach((button: any) => {
      button.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
      });
    });

    window.addEventListener('click', (event) => {
      if (event.target == loginModal) loginModal.style.display = 'none';
      if (event.target == registerModal) registerModal.style.display = 'none';
    });
  }

  async handleLogin(e: any) {
    e.preventDefault();
    const tsr = (this.shadowRoot as any);
    const username = tsr.getElementById('loginUsername').value;
    const password = tsr.getElementById('loginPassword').value;
    const success = await this.authObject.getProxy().login(username, password);
    if (success) {
      this.isLoggedIn = true;
      this.updateAuthUI();
      (this.shadowRoot as any).getElementById('loginModal').style.display = 'none';
    } else {
      alert('Login failed. Please try again.');
    }
  }

  async handleRegister(e: any) {
    e.preventDefault();
    const tsr = (this.shadowRoot as any);
    const username = tsr.getElementById('registerUsername').value;
    const password = tsr.getElementById('registerPassword').value;
    const confirmPassword = tsr.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    const success = await this.authObject.getProxy().register(username, password);
    if (success) {
      this.isLoggedIn = true;
      this.updateAuthUI();
      tsr.getElementById('registerModal').style.display = 'none';
    } else {
      alert('Registration failed. Please try again.');
    }
  }

  async handleLogout() {
    await this.authObject.getProxy().logout();
    this.isLoggedIn = false;
    this.updateAuthUI();
  }

  updateAuthUI() {
    const tsr = (this.shadowRoot as any);
    const loginButton = tsr.getElementById('loginButton');
    const registerButton = tsr.getElementById('registerButton');
    const logoutButton = tsr.getElementById('logoutButton');

    if (this.isLoggedIn) {
      loginButton.style.display = 'none';
      registerButton.style.display = 'none';
      logoutButton.style.display = 'inline-block';
    } else {
      loginButton.style.display = 'inline-block';
      registerButton.style.display = 'inline-block';
      logoutButton.style.display = 'none';
    }

    // Dispatch a custom event to notify the rest of the application about the auth state change
    this.dispatchEvent(new CustomEvent('authStateChange', { detail: { isLoggedIn: this.isLoggedIn } }));
  }
}

customElements.define('auth-component', AuthComponent);

export default AuthComponent;