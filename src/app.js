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
            to:"Todos",
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
        const listParticipants =  await db.collection('participants').find().toArray()
        res.send(listParticipants)
    }catch(error){
        res.sendStatus(400)
    }
})

app.post('/messages', async (req, res) =>{
    
    try{
        const {to,text,type} = req.body;
        const user = req.headers.user;

        const schemaParametro = Joi.object({
            to: Joi.string().required(),
            text: Joi.string().required(),
            type: Joi.string().valid('message', 'private_message').required()
        })
       
        const validation = schemaParametro.validate(req.body)
        if(validation.error) return res.sendStatus(422)

        const usuario = await db.collection('participants').findOne({name:user})
        console.log(user)
        if(!usuario) return res.sendStatus(422)
        
        await db.collection('messages').insertOne({
            from: user,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201)
    }catch (error){
        console.log(error.message)
        res.sendStatus(422)
    }
    
})

app.get('/messages', async (req, res) => {
    const user = req.headers.user
    const limit = Number(req.query.limit)
    const noLimit = req.query.limit
    try{
        if(typeof(noLimit) === 'string'){
            return res.status(422)
        }
        if(limit <= 0 ){
            return res.status(422)
        }
        
        const listMessage = await db.collection('messages').find({$or: [{to:'Todos'}, {to:user}, {from:user}]}).toArray()
        
        if(noLimit === undefined){
            return res.send(listMessage)
        }
        
        if(limit >0){
            
            return res.send(listMessage.slice(-limit))
        }
        

    }catch(error){
        return res.sendStatus(422)
    }
    
})


const PORT = 5000
app.listen(PORT, () =>console.log(`Servidor rodando na porta ${PORT}`))



/*app.post('/status', async (req, res) =>{
    const {user} = req.headers
    const status = 'status'
    if(!user) return res.status(404)

    setInterval(deletando(status),1000)
    res.send(200)
})
function deletando(rota){
    console.log(rota)
}*/