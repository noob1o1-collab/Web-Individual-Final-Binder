let localCsrfToken = "";

const showAlert = (message, isSuccess = false) => {
    const alertBox = document.getElementById('alertBox');
    alertBox.innerText = message;
    alertBox.className = isSuccess ? "alert alert-success" : "alert alert-error";
    alertBox.style.display = "block";
};

const clearAlert = () => {
    const alertBox = document.getElementById('alertBox');
    alertBox.style.display = "none";
};

async function initializeSecurityContext() {
    try {
        const response = await fetch('/api/csrf-token');
        const data = await response.json();
        localCsrfToken = data.csrfToken;
        console.log('CSRF Handshake completed. Client armed.');
    } catch (error) {
        console.error('Critical Security Setup Failed:', error);
        showAlert('Failed to establish secure environment session context.');
    }
}

document.getElementById('toRegister').addEventListener('click', () => {
    clearAlert();
    document.getElementById('loginPanel').style.display = 'none';
    document.getElementById('registerPanel').style.display = 'block';
});

document.getElementById('toLogin').addEventListener('click', () => {
    clearAlert();
    document.getElementById('registerPanel').style.display = 'none';
    document.getElementById('loginPanel').style.display = 'block';
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const payload = {
        username: document.getElementById('regUsername').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        birthday: document.getElementById('regBirthday').value || null
    };

    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': localCsrfToken
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('Account initialized! Redirecting...', true);
            setTimeout(() => {
                window.location.href = '/portal.html';
            }, 1500);
        } else {
            showAlert(result.error || 'Registration validation error encountered.');
        }
    } catch (err) {
        showAlert('Network connection failure communicating with authentication servers.');
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const payload = {
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': localCsrfToken
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('Identity authenticated. Launching workspace...', true);
            setTimeout(() => {
                window.location.href = '/portal.html';
            }, 1500);
        } else {
            showAlert(result.error || 'Invalid authentication credentials.');
        }
    } catch (err) {
        showAlert('Network connection failure communicating with verification servers.');
    }
});

initializeSecurityContext();
