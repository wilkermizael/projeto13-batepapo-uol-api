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
        
        res.sendStatus(500)
    }
   
})

app.get('/participants', async (req, res) =>{
    
    try{
        const listParticipants =  await db.collection('participants').find().toArray()
        if(listParticipants.length === 0){
            return res.send([])
        }
        res.send(listParticipants)
    }catch(error){
        res.sendStatus(500)
    }
})

app.post('/messages', async (req, res) =>{
    const {to,text,type} = req.body;
    const user = req.headers.user;
    const schemaParametro = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message', 'private_message').required()
    })
   
    const validation = schemaParametro.validate(req.body)
    if(validation.error) return res.sendStatus(422)
    
    try{
       
        const usuario = await db.collection('participants').find({name:user}).toArray()
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
        
        res.sendStatus(500)
    }
    
})

app.get('/messages', async (req, res) => {
    const user = req.headers.user
    const limit = Number(req.query.limit)
    console.log(user)
    try{
        if(limit!== undefined && (limit <= 0 || isNaN(limit) )){
            return res.status(422)
        }
        
        const listMessage = await db.collection('messages').find({$or: [{to:'Todos'}, {to:user}, {from:user}]}).toArray()
        res.send(listMessage)

    }catch(error){
        res.sendStatus(500)
    }
    
})

app.post('/status', async (req, res) =>{
    const user = req.headers.user
    if(!user) return res.status(404)
    try{
        const usuario = await db.collection('participants').findOne({name:user})
        if(!usuario) return res.status(404)

        const changeStatus = await db.collection('participants').updateOne({name:user} , {$set: {lastStatus:Date.now()}})
        res.sendStatus(200)
    }catch{
        res.sendStatus(500)
    }
    
   
})
setInterval((async ()=>{
    try{
        const participantes = await db.collection('participants').find({lastStatus:{$lte:Date.now() - 10000}}).toArray()
        participantes.map( async (item) =>{
            await db.collection('messages').insertOne(
                {
                from: item.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format('hh:mm:ss').toString()  
            })
            await db.collection('participants').deleteOne({name:item.name})
        }) 
    }catch{
        res.sendStatus(500)
    }
}),15000)

const PORT = 5000
app.listen(PORT, () =>console.log(`Servidor rodando na porta ${PORT}`))



