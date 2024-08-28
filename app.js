const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth'); // Import the mammoth library

const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Serve static files
app.use('/files', express.static(path.join(__dirname, 'uploads')));

// Serve the HTML file
app.use(express.static(path.join(__dirname, 'public')));

// Handle file conversion
app.post('/convert', upload.single('file'), async (req, res) => {
    try {
        // Ensure file is uploaded
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Define file path
        const filePath = path.join(__dirname, 'uploads', req.file.filename);
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 400]);

        // Determine the file type
        const fileType = req.file.mimetype;
        
        if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // Handle .docx files
            const docxContent = await mammoth.extractRawText({ path: filePath });
            page.drawText(docxContent.value, {
                x: 50,
                y: page.getHeight() - 100,
                size: 18 // Adjust font size
            });
        } else {
            // Handle other text-based files
            const text = fs.readFileSync(filePath, 'utf8');
            page.drawText(text, {
                x: 50,
                y: page.getHeight() - 100, // Adjust y-position
                size: 12, // Adjust font size
                maxWidth: page.getWidth() - 100 // Adjust maxWidth for wrapping
            });
        }

        // Save PDF and send response
        const pdfBytes = await pdfDoc.save();
        const pdfFilePath = path.join(__dirname, 'uploads', 'converted.pdf');
        fs.writeFileSync(pdfFilePath, pdfBytes);

        // Respond with JSON containing the file URL
        res.json({ fileUrl: `/files/converted.pdf` });
    } catch (error) {
        console.error('Error converting file:', error);
        res.status(500).send('An error occurred during file conversion.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
