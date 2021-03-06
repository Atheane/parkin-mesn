import moment from 'moment'
import User from '../models/user'
import Spot from '../models/spot'
import { formatSpot } from '../utils/format'
import { collection } from '../server.js'

export default (socket) => {
    socket.on("EMIT_SELECTSPOT", ({coord, token}) => {
        console.log("listen on EMIT_SELECTSPOT")
        if (coord && token) {
            console.log('coord', coord)
            User.findOne({ token }, (err, currentUser) => {
                if (err) {console.log(err.name + ': ' + err.message) }
                console.log("user:", currentUser)
             
                const query =  {
                    loc: {
                        type: 'Point',
                        coordinates: [ coord.longitude, coord.latitude] 
                    },
                }
                const newData = {
                    dateSave: moment(),
                    active: false,
                    assignedToUser: token
                }   // to-do if two people ask at the same place exactly and the sale time exactly, we may have pb

                Spot.findOneAndUpdate(query, newData, {upsert:true}, (err, spot) => {
                    if (err) {console.log(err.name + ': ' + err.message) }
                    console.log(spot, "updated with success")
                    socket.emit("ON_SPOTS", [{ spot: formatSpot(spot), selected: true }])
                    collection.remove(socket)
                    collection.emit('ON_DELETESPOT', {spot: formatSpot(spot)})
                })
            })
        } else {
            console.log("on EMIT_SELECTSPOT, no coordinates received from front", socket.id)
        }
    })
}
