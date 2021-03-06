import Expo from 'expo-server-sdk'
import User from '../models/user'
import Spot from '../models/spot'
import geodist from 'geodist'

let expo = new Expo()
let firstSpot

export default (socket) => {
  socket.on("EMIT_MOVINGUSERPOSITION", ({ userPosition, token }) => {
    console.log("EMIT_MOVINGUSERPOSITION", userPosition)
    if (userPosition && token) {
      User.findOne({token}, async (err, user) => {
        console.log("user", user)
        if (err) {console.log(err.name + ': ' + err.message) }
        if (user) {
          // const pushToken = await user.tokenPushNotification
          Spot.findOne({assignedToUser: token}, (err, spot) => {
            console.log("spot", spot)
            if (err) {console.log(err.name + ': ' + err.message) }
            if (spot) {
              const shouldPushANotification = geodist(
                {lat: userPosition.latitude, lon: userPosition.longitude},
                {lat: spot.loc.coordinates[1], lon: spot.loc.coordinates[0]},
                {unit: 'meters', limit: 50}
              )
              let counter = 0
              if (shouldPushANotification && counter === 0) {
                counter += 1
                console.log(counter)
                const title = 'Parkin'
                const body = 'êtes vous garé sur la place ?'
                socket.emit("ON_ARRIVAL", {
                  to: token,
                  sound: 'default',
                  title,
                  body,
                  coord: spot.loc.coordinates,
                  data: { message: `${title} - ${body}` }
                })
              } 
              //   if (!pushToken && !Expo.isExpoPushToken(pushToken)) {
              //     console.error(`Push token ${pushToken} is not a valid Expo push token`)
              //   }
              //   let messages = []
              //   messages.push(message)
              //   // let chunks = expo.chunkPushNotifications(messages);
              //   let tickets = []
              //   const pushNotifications = async () => {
              //     try {
              //       let ticketChunk = await expo.sendPushNotificationsAsync(messages);
              //       console.log(ticketChunk)
              //       tickets.push(...ticketChunk)
              //     } catch (error) {
              //       console.error(error)
              //     }

              //   }
              //   pushNotifications()
              
              //   // sending a notification produces a ticket, which
              //   // contains a receipt ID you later use to get the receipt.
              //   // The receipts may contain error codes to which you must respond. 
              //   let receiptIds = [];
              //   for (let ticket of tickets) {
              //     if (ticket.id) {
              //       receiptIds.push(ticket.id);
              //     }
              //   }

              //   let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
              //   const retrieveErrors = async () => {
              //     for (let chunk of receiptIdChunks) {
              //       try {
              //         let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
              //         console.log(receipts);

              //         for (let receipt of receipts) {
              //           if (receipt.status === 'ok') {
              //             continue;
              //           } else if (receipt.status === 'error') {
              //             console.error(`There was an error sending a notification: ${receipt.message}`);
              //             if (receipt.details && receipt.details.error) {
              //               // The error codes are listed in the Expo documentation:
              //               // https://docs.expo.io/versions/latest/guides/push-notifications#response-format 
              //               // You must handle the errors appropriately.
              //               console.error(`The error code is ${receipt.details.error}`);
              //             }
              //           }
              //         }
              //       } catch (error) {
              //         console.error(error);
              //       }
              //     }
              //   }
              // retrieveErrors()
              // }
            } else {
              Spot.aggregate(
                [  
                    { "$geoNear": {
                        "near": {
                            "type": "Point",
                            "coordinates": user.loc.coordinates
                        },
                        "distanceField": "distance",
                        "spherical": true,
                        "maxDistance": 800
                    }},
                    {"$match": {"active": true}},
                ],
                (err,spots) => {
                    if (err) {console.log(err.name + ': ' + err.message) }
                    console.log("spots around me and active", spots)
                    socket.emit("ON_SPOTS", (spots) ? spots.map(spot => {
                        return {spot: formatSpot(spot), selected: false}
                    }) : spots)
                }
            )
              console.log("on EMIT_MOVINGUSERPOSITION, No spot assined to user", user)
            }
          })
        } else {
          console.log("on EMIT_MOVINGUSERPOSITION, No user found in DB")
        }
      })
    } else {
      console.log("on EMIT_MOVINGUSERPOSITION, no data received from front", socket.id)
    }
  })
}