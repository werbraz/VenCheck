// ===== AUTH =====
const DEFAULT_PASSWORD = 'admin1234';
const PASSWORD_KEY = 'adminPassword';

function getStoredPassword() {
    return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
}

function checkPassword(input) {
    return input === getStoredPassword();
}

function changePassword(oldInput, newInput) {
    if (!checkPassword(oldInput)) return false;
    localStorage.setItem(PASSWORD_KEY, newInput);
    return true;
}
