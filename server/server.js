require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───
app.use(cors());
app.use(express.json());

// ─── Serve static files (HTML, CSS, JS, images) from parent directory ───
app.use(express.static(path.join(__dirname, '..')));

// ─── API Key Auth Middleware (for Zapier callbacks) ───
function requireApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ZAPIER_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    next();
}

// ─── Health Check (Zapier test URL) ───
app.get('/api/health', requireApiKey, (req, res) => {
    res.json({ status: 'ok', service: 'Yalla English API', timestamp: new Date().toISOString() });
});

// ─── Step 1: Register Student ───
// Frontend form submits here → forwards to Zapier, returns success
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone } = req.body;

        if (!firstName || !lastName || !email || !phone) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        // Forward to Zapier webhook
        const zapierResponse = await fetch(process.env.ZAPIER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, phone }),
        });

        if (!zapierResponse.ok) {
            console.error('Zapier webhook failed:', zapierResponse.status);
        }

        res.json({
            success: true,
            message: 'تم التسجيل بنجاح',
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'حدث خطأ في التسجيل' });
    }
});

// ─── Zapier Callback: Create Tap Payment ───
// Zapier calls this after student creation with FamilyID, Amount, etc.
// Creates a Tap Payments charge and returns the payment URL
app.post('/api/zapier/create-payment', requireApiKey, async (req, res) => {
    try {
        const { Amount, FamilyID, StudentID, Timestamp, email, firstName, lastName, phone } = req.body;

        const amount = parseFloat(Amount) || 199;

        // Create a Tap charge
        const chargePayload = {
            amount: amount,
            currency: 'SAR',
            threeDSecure: true,
            save_card: false,
            description: `Yalla English - اشتراك عرض المؤسسين (${FamilyID || 'N/A'})`,
            statement_descriptor: 'Yalla English',
            metadata: {
                familyId: FamilyID,
                studentId: StudentID,
                timestamp: Timestamp,
            },
            reference: {
                transaction: `YE-${FamilyID || Date.now()}`,
                order: `ORDER-${FamilyID || Date.now()}`,
            },
            receipt: {
                email: true,
                sms: true,
            },
            customer: {
                first_name: firstName || '',
                last_name: lastName || '',
                email: email || '',
                phone: phone ? { country_code: '966', number: phone.replace(/^0+/, '') } : undefined,
            },
            source: { id: 'src_all' },
            language: 'ar',
            post: {
                url: `${process.env.FRONTEND_URL}/api/tap/webhook`,
            },
            redirect: {
                url: `${process.env.FRONTEND_URL}/payment-success.html?family_id=${FamilyID || ''}`,
            },
        };

        const tapResponse = await fetch('https://api.tap.company/v2/charges', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.TAP_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chargePayload),
        });

        const tapData = await tapResponse.json();

        if (!tapResponse.ok) {
            console.error('Tap API error:', tapData);
            return res.status(400).json({ error: 'فشل إنشاء رابط الدفع', details: tapData });
        }

        console.log('Tap charge created:', tapData.id, '→', tapData.transaction?.url);

        let paymentUrl = tapData.transaction?.url || '';
        paymentUrl = paymentUrl.replace('language=en', 'language=ar');

        res.json({
            success: true,
            chargeId: tapData.id,
            paymentUrl: paymentUrl,
            status: tapData.status,
        });
    } catch (err) {
        console.error('Payment creation error:', err);
        res.status(500).json({ error: 'حدث خطأ في إنشاء الدفع' });
    }
});

// ─── Tap Webhook: Payment Result ───
// Tap POSTs the charge result after payment completes
// On success → forwards to Zapier Flow 2 (Add Payment + Activate Student)
app.post('/api/tap/webhook', async (req, res) => {
    try {
        console.log('═══ TAP WEBHOOK RECEIVED ═══');
        console.log('Body:', JSON.stringify(req.body, null, 2));

        const { id, status, amount, currency, customer, metadata, reference } = req.body;

        console.log(`💳 Payment ${status}: charge_${id} | ${amount} ${currency}`);
        console.log(`   FamilyID: ${metadata?.familyId}`);
        console.log(`   Customer: ${customer?.first_name} ${customer?.last_name} (${customer?.email})`);
        console.log(`   ZAPIER_PAYMENT_WEBHOOK_URL set: ${!!process.env.ZAPIER_PAYMENT_WEBHOOK_URL}`);

        if (status === 'CAPTURED') {
            console.log('✅ Payment successful! Forwarding to Zapier Flow 2...');

            // Send to Zapier Flow 2: Add Payment + Activate Student
            if (process.env.ZAPIER_PAYMENT_WEBHOOK_URL) {
                try {
                    await fetch(process.env.ZAPIER_PAYMENT_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chargeId: id,
                            status: status,
                            amount: amount,
                            currency: currency,
                            email: customer?.email || '',
                            firstName: customer?.first_name || '',
                            lastName: customer?.last_name || '',
                            phone: customer?.phone?.number || '',
                            familyId: metadata?.familyId || '',
                            studentId: metadata?.studentId || '',
                            transactionRef: reference?.transaction || '',
                            paidAt: new Date().toISOString(),
                        }),
                    });
                    console.log('   → Zapier Flow 2 notified');
                } catch (zapErr) {
                    console.error('   → Zapier Flow 2 notification failed:', zapErr.message);
                }
            }
        } else {
            console.log(`⚠️ Payment status: ${status}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Tap webhook error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// ─── Direct Payment: Frontend creates charge directly ───
// For the two-step form flow on the landing page
app.post('/api/create-charge', async (req, res) => {
    try {
        const { firstName, lastName, email, phone } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
        }

        const chargePayload = {
            amount: 199,
            currency: 'SAR',
            threeDSecure: true,
            save_card: false,
            description: 'Yalla English - اشتراك عرض المؤسسين',
            statement_descriptor: 'Yalla English',
            metadata: {
                source: 'landing-page',
                registeredAt: new Date().toISOString(),
            },
            reference: {
                transaction: `YE-${Date.now()}`,
                order: `ORDER-${Date.now()}`,
            },
            receipt: {
                email: true,
                sms: true,
            },
            customer: {
                first_name: firstName || '',
                last_name: lastName || '',
                email: email,
                phone: phone ? { country_code: '966', number: phone.replace(/^0+/, '') } : undefined,
            },
            source: { id: 'src_all' },
            post: {
                url: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/api/tap/webhook`,
            },
            redirect: {
                url: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/payment-success.html`,
            },
        };

        const tapResponse = await fetch('https://api.tap.company/v2/charges', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.TAP_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chargePayload),
        });

        const tapData = await tapResponse.json();

        if (!tapResponse.ok) {
            console.error('Tap API error:', JSON.stringify(tapData, null, 2));
            console.error('Tap status:', tapResponse.status);
            return res.status(400).json({ error: 'فشل إنشاء رابط الدفع', details: tapData });
        }

        // Force Arabic on checkout page
        let paymentUrl = tapData.transaction?.url || '';
        paymentUrl = paymentUrl.replace('language=en', 'language=ar');

        res.json({
            success: true,
            chargeId: tapData.id,
            paymentUrl: paymentUrl,
        });
    } catch (err) {
        console.error('Charge creation error:', err);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

// ─── Verify Charge Status ───
// Frontend calls this after Tap redirects back to check if payment succeeded
app.get('/api/verify-charge/:chargeId', async (req, res) => {
    try {
        const tapResponse = await fetch(`https://api.tap.company/v2/charges/${req.params.chargeId}`, {
            headers: {
                'Authorization': `Bearer ${process.env.TAP_SECRET_KEY}`,
            },
        });
        const tapData = await tapResponse.json();

        res.json({
            status: tapData.status,
            amount: tapData.amount,
            currency: tapData.currency,
            chargeId: tapData.id,
        });
    } catch (err) {
        console.error('Verify charge error:', err);
        res.status(500).json({ error: 'Failed to verify charge' });
    }
});

// ─── Tap Public Config (for goSell.js frontend) ───
app.get('/api/tap/config', (req, res) => {
    res.json({
        publicKey: process.env.TAP_PUBLIC_KEY,
    });
});

// ─── Charge from Token (embedded payment form) ───
// goSell.js generates a card token → frontend sends it here → we create the charge
app.post('/api/charge-token', async (req, res) => {
    try {
        const { token, firstName, lastName, email, phone } = req.body;

        if (!token || !email) {
            return res.status(400).json({ error: 'Token and email are required' });
        }

        const chargePayload = {
            amount: 199,
            currency: 'SAR',
            threeDSecure: true,
            save_card: false,
            description: 'Yalla English - اشتراك عرض المؤسسين',
            statement_descriptor: 'Yalla English',
            metadata: {
                source: 'embedded-form',
                registeredAt: new Date().toISOString(),
            },
            reference: {
                transaction: `YE-${Date.now()}`,
                order: `ORDER-${Date.now()}`,
            },
            receipt: { email: true, sms: true },
            customer: {
                first_name: firstName || '',
                last_name: lastName || '',
                email: email,
                phone: phone ? { country_code: '966', number: phone.replace(/^0+/, '') } : undefined,
            },
            source: { id: token }, // Token from goSell.js
            language: 'ar',
            post: {
                url: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/api/tap/webhook`,
            },
            redirect: {
                url: `${process.env.FRONTEND_URL || 'http://localhost:5500'}/payment-success.html`,
            },
        };

        const tapResponse = await fetch('https://api.tap.company/v2/charges', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.TAP_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chargePayload),
        });

        const tapData = await tapResponse.json();

        if (!tapResponse.ok) {
            console.error('Tap charge-token error:', JSON.stringify(tapData, null, 2));
            return res.status(400).json({ error: 'فشل إنشاء الدفع', details: tapData });
        }

        res.json({
            success: true,
            chargeId: tapData.id,
            status: tapData.status,
            redirectUrl: tapData.transaction?.url, // For 3DS redirect if needed
        });
    } catch (err) {
        console.error('Charge-token error:', err);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

// ─── Start Server ───
app.listen(PORT, () => {
    console.log(`🚀 Yalla English API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Register: http://localhost:${PORT}/api/register`);
    console.log(`   Create Charge: http://localhost:${PORT}/api/create-charge`);
});
