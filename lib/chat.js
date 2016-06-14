/*
 * chat.js - module to provide chat messaging
*/

/*jslint         node    : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
/*global */

// ------------ BEGIN MODULE SCOPE VARIABLES --------------
'use strict';
var
  emitUserList, signIn, signOut, chatObj,
  socket = require( 'socket.io' ),
  crud   = require( './crud'    ),

  makeMongoId = crud.makeMongoId,join_room,
  chatterMap  = {};
// -------

//------ END MODULE SCOPE VARIABLES ---------------

// ---------------- BEGIN UTILITY METHODS -----------------
// 모든 연결 클라이언트로 사용자 목록 브로드캐스트
emitUserList = function ( io ) {
  crud.read(
    'user',
    { is_online : true },
    {},
    function ( result_list ) {
      io
        .of( '/chat' )
        .emit( 'listchange', result_list );
    }
  );
};

// signIn - is_online 속성과 chatterMap 업데이트
signIn = function ( io, user_map, socket ) {
  crud.update(
    'user',
    { '_id'     : user_map._id },
    { is_online : true         },
    function ( result_map ) {
      emitUserList( io );
      user_map.is_online = true;
      socket.emit( 'userupdate', user_map );
    }
  );

  chatterMap[ user_map._id ] = socket;
  socket.user_id = user_map._id;
};

// signOut - update is_online property and chatterMap
//
signOut = function ( io, user_id ) {
  crud.update(
    'user',
    { '_id'     : user_id },
    { is_online : false   },
    function ( result_list ) { emitUserList( io ); }
  );
  delete chatterMap[ user_id ];
};

join_room = function (room, socket){
    socket.join(room);

    console.log("testcase",room);

    crud.read(
        'conv_log',
        { room_id : room.toString() },
        { 'sort' : [ 'date' , 'desc']},
        function ( result_list ){
            socket.emit('roadchatlog',result_list);
        }
    );
};
// ----------------- END UTILITY METHODS ------------------

// ---------------- BEGIN PUBLIC METHODS ------------------
chatObj = {
  connect : function ( server ) {
    var io = socket.listen( server );

    // Begin io setup
    io
      .set( 'blacklist' , [] )
      .of( '/chat' )
      .on( 'connection', function ( socket ) {

        //'adduser' 이벤트 발생시 수신
        socket.on( 'adduser', function ( user_map ) {
          crud.read(
            'user',
            { name : user_map.name },
            {},
            function ( result_list ) {
              var
                result_map,
                cid = user_map.cid;

              delete user_map.cid;

              // 이미 존재하는 이름일때
              if ( result_list.length > 0 ) {
                result_map     = result_list[ 0 ];
                result_map.cid = cid;
                signIn( io, result_map, socket );
              }

              // 존재하지 않을때 DB 생성
              else {
                user_map.is_online = true;
                crud.construct(
                  'user',
                  user_map,
                  function ( result_list ) {
                    result_map     = result_list[ 0 ];
                    result_map.cid = cid;
                    chatterMap[ result_map._id ] = socket;
                    socket.user_id = result_map._id;
                    socket.emit( 'userupdate', result_map );
                    emitUserList( io );
                  }
                );
              }
            }
          );
        });
        // adduser/메시지 핸들러 끝

        // addroom/메시지 핸들러 시작
        socket.on( 'addroom', function ( room_map ){
           crud.read(
               'conversation',
               { $or : [
                   {chat_with : [ room_map.user_id, room_map.chatee_id]},
                   {chat_with : [ room_map.chatee_id, room_map.user_id]}
               ]},
               {},
               function ( result_list ){
                   var
                       result_map,
                       room_id;
                   //console.log("존재하는 방 개수",result_list.length, room_map.user_id,  makeMongoId(room_map.chatee_id));
                   //이미 존재하는 방일때
                   if( result_list.length >0 ){
                     //  console.log("존재하는 방",result_list.length);
                        result_map = result_list[ 0 ];
                       join_room(result_map._id,socket);
                        socket.emit('roomupdate', result_map );
                        socket.emit('avtrlistchange', result_map );
                   }
                   else{
                        crud.construct(
                            'conversation',
                            { name : room_map.name,
                              chat_with : [ room_map.user_id, room_map.chatee_id ],
                              talker_css : [{ t_id : room_map.user_id
                              , css_map : {top : 20, left : 20, 'background-color' : 'rgb( 128, 128, 128)'} },
                                            { t_id : room_map.chatee_id
                              , css_map : {top : 20, left : 20, 'background-color' : 'rgb( 128, 128, 128)'} }
                              ]
                            },
                            function ( result_listT ){
                                var
                                result_map = result_listT[ 0 ];
                                join_room(result_map._id,socket);
                                socket.emit( 'roomupdate', result_map );
                                socket.emit('avtrlistchange', result_map );
                            }
                        );
                   }
               }
           );
        });
        //addroom/메시지 핸들러 끝

        // /updatechat/ 메시지 핸들러 시작
        socket.on( 'updatechat', function ( chat_map ) {
           var result_map,
               room_id = chat_map.room_id,
               sender = chat_map.sender_name,
               sender_id = chat_map.sender_id,
               msg = chat_map.msg_text
               ;
             //console.log('updatechat_room_id', room_id);
            crud.construct(
                'conv_log',
                { room_id : room_id ,
                  sender : sender,
                  sender_id : sender_id,
                  msg    : msg,
                  date   : new Date()
                },
                function ( result_list ) {
                }
            );
            socket.broadcast.to(room_id).emit( 'updatechat', chat_map );
        });
        // /updatechat/ 메시지 핸들러 끝

        // /disconnect 메서드 시작
        socket.on( 'leavechat', function () {
          console.log(
            '** user %s logged out **', socket.user_id
          );
          signOut( io, socket.user_id );
        });

        socket.on( 'disconnect', function () {
          console.log(
            '** user %s closed browser window or tab **',
            socket.user_id
          );
          signOut( io, socket.user_id );
        });
        // /disconnect 메서드 끝

        // /updateavatar/ 메세지 핸들러
        socket.on( 'updateavatar', function ( avtr_map ) {
          crud.update(
            'conversation',
            { '_id'   : makeMongoId( avtr_map.room_id ),
                'talker_css.t_id' : avtr_map.person_id.toString()
            },
            { 'talker_css.$.css_map' : avtr_map.css_map },
            function ( result_list ) {
                crud.read(
                    'conversation',
                    {'_id' :makeMongoId( avtr_map.room_id)  },
                    {},
                    function ( result_map ){

                        socket.broadcast.to(avtr_map.room_id).emit('avtrlistchange', result_map[0] );
                    }
                );
            }
          );
        });
        // /updateavatar/ 메시지 핸들러 끝
      }
    );
    // End io setup

    return io;
  }
};

module.exports = chatObj;
// ----------------- END PUBLIC METHODS -------------------
