const sqlite3 = require("sqlite3").verbose();
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();


class ContactosModel {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, "/database", "database.db"), (err) => {
      if (err) {
        console.log('Error');
      }
      console.log('Database created successfully')
    });
  }

  conectar() {
    this.db.run('CREATE TABLE IF NOT EXISTS contactos(name VARCHAR(255), email VARCHAR(255), commentary TEXT,ip TEXT,date TEXT,country TEXT)');
  }

  guardar(nombre, correo, comentario, ip, fecha, pais) {
    this.db.run("INSERT INTO contactos VALUES (?, ?, ?, ?, ?, ?)", [nombre, correo, comentario, ip, fecha, pais]);
  }

  getContacts(){
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM contactos",[],(err, rows) => {
        rows ? resolve(rows):reject(err)
      })
    })
  }
}


class ContactosController {
  constructor() {
    this.model = new ContactosModel();
    this.model.conectar();
  }

  async save(req, res) {
    const { name, email, commentary } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress;
    let hoy = new Date();
    let horas = hoy.getHours();
    let fecha = hoy.getDate() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getFullYear() + '' + '/' + '' + horas;

    const response_key = req.body["g-recaptcha-response"];
    const secret_key = process.env.RECAPTCHAPRIVATE;
    const urlPais = 'http://ipwho.is/' + ip
    const urlPaisFetch = await fetch(urlPais)
    const jsonUrlPais = await urlPaisFetch.json();
    const pais = jsonUrlPais.country;

    const urlKey = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${response_key}`;
    const recaptchaKey = await fetch(urlKey, { method: "post", });
    const google_data = await recaptchaKey.json();
    if (google_data.success == true) {

      const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465,
        secureConnection: false, // use SSL
        auth: {
          user: process.env.CORREO,
          pass: process.env.CONTRASENA,
        }
      });

      // Configure the mailoptions object
      const mailOptions = {
        from: process.env.CORREO,
        to: 'programacion2ais@dispostable.com',
        subject: 'Contact information',
        html: `
               <h1>Welcome!</h1>
               <p>Nombre: ${name}</p>
               <p>Correo: ${email}</p>
               <p>Fecha/Hora: ${fecha}</p>
               <p>Pais: ${pais}</p>
               <p>Ip: ${ip}</p>`
      };

      // Send the email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log(info)
          this.model.guardar(name, email, commentary, ip, fecha, pais);
          return res.send({ response: "Contact save and email successfully" });
        }
      });
    } else {
      res.send({ response: 'Error in captcha' })
    }






  }
}


module.exports = ContactosController