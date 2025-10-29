const ContactMessage = require('../models/ContactMessage');
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'jovote2025@gmail.com',
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send contact message
exports.sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, subject, and message'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.get('user-agent') || '';

    // Create contact message document
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      ipAddress,
      userAgent,
      category: 'general'
    });

    // Save to database
    await contactMessage.save();

    // Send confirmation email to user
    const userEmailOptions = {
      from: process.env.EMAIL_USER || 'jovote2025@gmail.com',
      to: email,
      subject: `Message Received - JOVOTE Journal`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Message Received</h2>
          </div>
          <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Dear ${name},</p>
            <p>Thank you for contacting the Journal of Vocational Teacher Education (JOVOTE). We have received your message and will review it shortly.</p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p><strong>Your Message Details:</strong></p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>Our editorial team will respond to your inquiry within 2-3 business days.</p>
            
            <p>Best regards,<br/>
            <strong>JOVOTE Editorial Team</strong><br/>
            Journal of Vocational Teacher Education<br/>
            School of Secondary Education (Vocational)<br/>
            Federal College of Education (Technical), Potiskum<br/>
            Yobe State, Nigeria<br/>
            Email: jovote2025@gmail.com<br/>
            Phone: +234-803-494-2253
            </p>
          </div>
        </div>
      `
    };

    // Send notification email to editor
    const editorEmailOptions = {
      from: process.env.EMAIL_USER || 'jovote2025@gmail.com',
      to: process.env.EDITOR_EMAIL || 'jovote2025@gmail.com',
      subject: `New Contact Message - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">New Contact Message</h2>
          </div>
          <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p><strong>Message:</strong></p>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p style="color: #666; font-size: 12px;">
              <strong>IP Address:</strong> ${ipAddress}<br/>
              <strong>Message ID:</strong> ${contactMessage._id}
            </p>
          </div>
        </div>
      `
    };

    // Send emails
    try {
      await transporter.sendMail(userEmailOptions);
      console.log('✅ Confirmation email sent to user:', email);
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email to user:', emailError.message);
    }

    try {
      await transporter.sendMail(editorEmailOptions);
      console.log('✅ Notification email sent to editor');
    } catch (emailError) {
      console.error('⚠️ Failed to send notification email to editor:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will respond shortly.',
      messageId: contactMessage._id
    });

  } catch (error) {
    console.error('Error sending contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all contact messages (admin only)
exports.getAllMessages = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    
    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactMessage.countDocuments(query);

    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single message (admin only)
exports.getMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Mark as read
    if (message.status === 'new') {
      message.status = 'read';
      await message.save();
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update message status (admin only)
exports.updateMessageStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true, runValidators: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete message (admin only)
exports.deleteMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

