
const express = require("express");
const multer = require("multer");
const path = require("path");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.post("/submit", upload.single("attachment"), async (req, res) => {
  const { name, phone, country, product, weight, description } = req.body;
  const file = req.file;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Order");

    worksheet.columns = [
      { header: "Field", key: "field" },
      { header: "Value", key: "value" }
    ];

    worksheet.addRow({ field: "Name", value: name });
    worksheet.addRow({ field: "Phone", value: phone });
    worksheet.addRow({ field: "Country", value: country });
    worksheet.addRow({ field: "", value: "" });
    worksheet.addRow({ field: "Products", value: "" });

    if (Array.isArray(product)) {
      for (let i = 0; i < product.length; i++) {
        worksheet.addRow({
          field: `Product ${i + 1}`,
          value: `${product[i]} - ${weight[i]} - ${description[i]}`
        });
      }
    } else {
      worksheet.addRow({
        field: "Product 1",
        value: `${product} - ${weight} - ${description}`
      });
    }

    const excelPath = "uploads/order-" + Date.now() + ".xlsx";
    await workbook.xlsx.writeFile(excelPath);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: "New Order Received",
      text: "Please find the attached order file.",
      attachments: [
        { filename: "order.xlsx", path: excelPath },
        file ? { filename: file.originalname, path: file.path } : null
      ].filter(Boolean)
    };

    await transporter.sendMail(mailOptions);
    res.send("Order submitted and emailed successfully! Our experts will contact you shortly. Thank you!");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Server Error: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
