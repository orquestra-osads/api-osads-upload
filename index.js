const express = require("express");
const fileUpload = require('express-fileupload');
const { google } = require('googleapis')
const path = require('path')
const fs = require('fs')
const bodyParser = require('body-parser')
const cors = require('cors');
require('dotenv').config();


const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN })

const drive = google.drive({
  version: 'v3',
  auth: oauth2Client
})


//App express

const app = express();
app.use(express.json());
app.use(fileUpload());
app.use(cors());


// Routes 

app.get("/", async (req, res) => {
  return res.sendFile(`${__dirname}/upload.html`);
});

app.post("/upload/folder/:id", async (req, res) => {
   
    try {
      //Folder ID
      const folderId = `${req.params.id}`;
      console.log(folderId);
      
      //upload File
      const file = req.files.myFile;
      const fileName = new Date().getTime().toString() + path.extname(file.name)
      const filePath = path.join(__dirname, 'public', 'uploads', fileName)
      await file.mv(filePath)

      const response = await drive.files.create({
        requestBody: {
          name: `${file.name}`,
          mimeType : `${file.mimetype}`,
          parents: [`${folderId}`],

        },
        media: {
          mimeType: `${file.mimetype}`,
          body: fs.createReadStream(filePath)
        }
    
      });

      // public url
      const fileId = response.data.id
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      })
      const result = await drive.files.get({
        fileId: fileId, 
        fields: 'webViewLink, webContentLink',
      })

      //Removendo os arquivos do diretório
      const directory = path.join (__dirname, '/public/uploads'); 
      fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
          fs.unlink(path.join(directory, file), err => {
            if (err) throw err;
          });
        }
      });


      //Results
      console.log(result.data) 
      console.log(response.data)      
      result.data.id = fileId
      result.data.name = response.data.name
      //end coding       
      return res.json(result.data)

    } catch (error) {
      console.log(error.message)
    }
});

app.post('/upload/list', async (req, res)=>{

  try{
      const folder = req.body.pasta.folder 
      console.log(req.body.pasta.folder)
    
      const result = await drive.files.list({
        pageSize: 8,
        fields: 'nextPageToken, files(id, name, mimeType, webContentLink, webViewLink)',
        q: `trashed=false and parents = '${folder}'`,
        
      })
      
      const files = result.data
      console.log(files.files)
      return res.json(files.files)

  } catch(err){
    console.log(err)
  }
})

app.delete('/file/:id', async (req, res) => {
      const fileId = req.params.id
      console.log(fileId)
      try{
          const response = await drive.files.delete({
              fileId: fileId
          })
          console.log("Arquivo apagado com sucesso!")
          return res.json("Arquivo apagado com sucesso!")
      } catch (error){
          console.log(error.message)
      }
})


app.listen(process.env.PORT || 4000, () => 
  console.log(`App is listening on port ${4000}.`)
);



