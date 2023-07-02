import express from "express"
import cors from "cors"
import {MongoClient} from "mongodb"
import Joi from "joi"
import dotenv from "dotenv"
import dayjs from "dayjs"
//Criação do app
const app = express()

//Configurações
app.use(cors())
app.use(express.json())
dotenv.config()

//Conexao com o bando de dados
const mongoClient = new MongoClient(process.env.DATABASE_URL)

try{
    await mongoClient.connect()
}catch(err){
    console.log(err.message)
}
const db = mongoClient.db()

// Rotas
app.post('/participants', async (req, res) =>{
    const {name} = req.body
    const schemaName = Joi.object({name: Joi.string().hostname().required()})
    
    const validation = schemaName.validate(req.body)
    if(validation.error) return res.sendStatus(422)
  
    try{
        
        const nome = await db.collection('participants').findOne({name})
        if(nome) return res.sendStatus(409)
        await db.collection('participants').insertOne({name , lastStatus:Date.now()})
        await db.collection('messages').insertOne({
            from:name,
            to:"todos",
            text:"entra na sala...",
            type:"status",
            time:dayjs().format('hh:mm:ss').toString()  
        })
        res.sendStatus(201)
    }catch(err){
        console.log(err.message)
    }
   
})

app.get('/participants', async (req, res) =>{
    try{
        const lisParticipants =  await db.collection('participants').find().toArray()
        res.send(lisParticipants)
    }catch(error){
        res.sendStatus(400)
    }
})

app.post('/messages', async (req, res) =>{
    const {to,text,type} = req.body
    const {user} = req.headers
    if(!user) return res.sendStatus(422)
    const schemaParametro = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message', 'private_message').required()
    })
   
    const validation = schemaParametro.validate(req.body)
    if(validation.error) return res.sendStatus(422)

    try{
        const usuario = db.collection('participants').find({user})
        if(!usuario) return res.sendStatus(422)
        
        await db.collection('messages').insertOne({
            from: user,
            to: to,
            text: text,
            type: type,
            time: dayjs().toString()
        })
        res.sendStatus(201)
    }catch (error){
        console.log(error.message)
        res.sendStatus(422)
    }
    
})

/*app.get('/messages', async (req, res) => {

})*/
const PORT = 5000
app.listen(PORT, () =>console.log(`Servidor rodando na porta ${PORT}`))


/*const listParticipants =  await db.collection('participants').find().toArray()
        //console.log(listParticipants)
        const listaDosNomes = listParticipants.map(item =>{
            return(item.name)
            
        })
        res.send(listaDosNomes)*/