/**
 * Created by khwbori on 2016. 1. 22..
 */
/*
    mta.model.js
    모델 모듈
*/

/*jslint browser: true, continue: true,
 devel: true, indent:2, maxerr:50,
 newcap:true, nomen:true, plusplus: true,
 regexp:true, sloppy:true, vars: true,
 white: true
 */

/*global TAFFY, $, mta */
mta.model = (function (){
    'use strict';
    var
        configMap = { anon_id : 'a0'},
        stateMap = {
            anon_user      : null,
            cid_serial     : 0,
            people_cid_map : {},
            people_db      : TAFFY(),
            user           : null,
            room_id        : null,
            old_chat_log   : {},
            new_chat_log   : {},

            is_connected   : false
        },

        isFakeData = false,

        personProto, makeCid, clearPeopleDb, completeLogin,
        makePerson, removePerson, enterRoom,
        people, chat, initModule
    ;

    personProto = {
        get_is_user : function (){
            return this.cid === stateMap.user.cid;
        },
        get_is_anon : function (){
            return this.cid === stateMap.anon_user.cid;
        }
    };

    makeCid = function () {
        return 'c'+ String(stateMap.cid_serial++);
    };

    //익명 person과 사용자가 로그인한 경우 현재 사용자를 제외한 모든 Person 객체를 제거하는 메서드
    clearPeopleDb = function () {
        var user = stateMap.user;
        stateMap.people_db = TAFFY();
        stateMap.people_cid_map = {};
        if( user ){
            stateMap.people_db.insert( user );
            stateMap.people_cid_map[ user.cid ] = user;
        }
    };

    completeLogin =  function ( user_list ){
        var user_map = user_list[ 0 ];
        console.log('completeLogin' ,user_map );
        delete stateMap.people_cid_map[ user_map.cid ];
        stateMap.user.cid = user_map._id;
        stateMap.user.id = user_map._id;
        stateMap.people_cid_map[ user_map._id ] = stateMap.user;

        //채팅 기능을 추가할 때 여기서 채팅에 참여하게 해야 한다.
        chat.join();//채팅방 참여
        $.gevent.publish( 'mta-login', [stateMap.user] );
    };

    makePerson = function ( person_map ) {
        var person,
            cid     = person_map.cid,
            id      = person_map.id,
            name    = person_map.name;
        if( cid === undefined || ! name ){
            throw 'client id and name required';
        }

        person      = Object.create( personProto );
        person.cid  = cid;
        person.name = name;

        if( id ){ person.id = id; }

        stateMap.people_cid_map[ cid ] = person;

        stateMap.people_db.insert( person );
        return person;
    };

    removePerson = function ( person ) {
        if( !person ) { return false; }
        // 익명인 사람은 제거할 수 없다
        if( person.id === configMap.anon_id ){
            return false;
        }
        stateMap.people_db({ cid : person.cid }).remove();
        if( person.cid ){
            delete stateMap.people_cid_map[ person.cid ];
        }

        return true;
    };

    //클로저를 통해 원하는 메서드만 외부로 공개
    people = (function (){
        var get_by_cid, get_db, get_user, login, logout;
        get_by_cid = function ( cid ){
            return stateMap.people_cid_map[ cid ];
        };

        get_db = function () { return stateMap.people_db; };

        get_user = function () { return stateMap.user; };

        login = function ( name ) {
            var sio = isFakeData? mta.fake.mockSio : mta.data.getSio();
            console.log(sio);
            stateMap.user = makePerson({
                cid     : makeCid(),
                name    : name
            });

            sio.on( 'userupdate', completeLogin );

            sio.emit( 'adduser', {
                cid     : stateMap.user.cid,
                name    : stateMap.user.name
            });
        };

        //people 클로저에 logout메서드를 정의. mta-logout이벤트를 발송
        logout = function (){
            var user = stateMap.user;
            //채팅 기능을 추가할 때 여기서 채팅방을 떠나야 한다.
            chat._leave();//채팅방 떠나기
            stateMap.user = stateMap.anon_user;
            clearPeopleDb();
            $.gevent.publish( 'mta-logout', [ user ] );

        };

        return {
            get_by_cid : get_by_cid,
            get_db     : get_db,
            get_user   : get_user,
            login      : login,
            logout     : logout
        };
    }());

    enterRoom = function ( arg_map ){
        var sio = isFakeData? mta.fake.mockSio : mta.data.getSio();
        var room_map = arg_map[0];
        stateMap.room_id=room_map._id;
        $.gevent.publish( 'mta-setchatee', { room_id : room_map._id, room_name : room_map.name });
    };  //mta-setchatee 이벤트를 발생시켜 chat.js에서 채팅방으로이동하도록 함.

    chat = (function (){
       var
           _publish_listchange, _publish_avtrlistchange,
           _publish_updatechat,  _publish_updatechat_set,
           _update_flist, _update_clist, _leave_chat,

           get_chatee, join_chat,send_msg, set_chatee,
           update_avatar,

           chat_room = null,
           chatee = null
           ;

        //------------내부 메서드 시작

        //새 사람들 목록을 전달받으면 사람들 객체를 갱신할 수 있는 _update_flist 메서드 구현
        _update_flist = function ( arg_list ){
            var i, person_map, make_person_map, person,
                people_list = arg_list[0],
                is_chatee_online = false;

            clearPeopleDb();

            PERSON:
            for( i=0; i < people_list.length; i++ ){
                person_map =  people_list[i];
                if( !person_map.name ) { continue PERSON; }
                // 사용자가 정의돼 있으면 나머지 코드를 건너뜀
                if( stateMap.user && stateMap.user.id === person_map._id ){
                    continue PERSON;
                }
                make_person_map = {
                    cid     : person_map._id,
                    id      : person_map._id,
                    name    : person_map.name
                };
                person =  makePerson( make_person_map );
                if( chatee && chatee.id === make_person_map.id ){
                    is_chatee_online =true;
                    chatee = person;
                }

            }
            stateMap.people_db.sort( 'name' );
            //채팅 상대가 더는 온라인 상태가 아니면 채팅 상대 설정을 해제
            // 'mta-setchatee' 전역 이벤트 발생
            if( chatee && ! is_chatee_online ){ set_chatee(''); }
        };
        /*
        _update_clist = function ( arg_list ){
            var i, room_map, make_room_map, room,
                room_list = arg_list[0];
        };*/
        //업데이트된 사람들 목록 데이터와 함께 mta-listchange 전역 제이쿼리 이벤트 발송
        _publish_listchange = function ( arg_list ){
            _update_flist ( arg_list );
            $.gevent.publish( 'mta-listchange', [ arg_list ] );
        };
        _publish_avtrlistchange = function ( arg_list ){
            $.gevent.publish( 'mta-avtrlistchange', arg_list[0]  );
        };  //avtr.js로 mta-avtrlistchang 이벤트 전송 아바타 모습 랜더링.

        // 메시지 상세 정보 데이터를 담아 mta-updatechat이벤트를 발송한다
        _publish_updatechat = function ( arg_list ){
            var msg_map = arg_list[ 0 ];
            if( msg_map.room_id===stateMap.room_id){
                $.gevent.publish( 'mta-updatechat', [ msg_map ] );
            } //mta-updatechat 이벤트 발생시켜 chat.js 에서 msg_map을 받아 처리
        };
        //미정...

        _publish_updatechat_set = function ( arg_list ){
            var msg_map = arg_list[0];
            console.log('roadchat',arg_list);
            $.gevent.publish('mta-updateroadchat',arg_list);
            //mta-updateroadchat 이벤트 발생시켜 chat.js 에서 arg_list을 받아 처리
        };

        //-------------------내부 메서드 끝

        // leavechat 메시지 전송
        _leave_chat = function () {
            var sio = isFakeData ? mta.fake.mockSio : mta.data.getSio();
            chatee = null;
            stateMap.is_connected = false;
            if( sio ){ sio.emit( 'leavechat' ); }
        };

        //채팅 상대 Person 객체를 반환
        get_chatee = function () { return chatee; }

        //채팅방에 참여.
        join_chat = function (){
            var sio;

            if ( stateMap.is_connected ) { return false; }

            if ( stateMap.user.get_is_anon() ){
                console.warn( 'User must be defined before joining chat');
                return false;
            }

            sio = isFakeData ? mta.fake.mockSio : mta.data.getSio();
            sio.on( 'listchange', _publish_listchange );
            sio.on( 'avtrlistchange', _publish_avtrlistchange );
            sio.on( 'roadchatlog',_publish_updatechat_set );
            sio.on( 'updatechat', _publish_updatechat ); //메시지를 받을 때마다 이벤트 발생
            stateMap.is_connected = true;
            return true;
        };

        send_msg = function ( arg_map ){
            var msg_map,
                sio = isFakeData ? mta.fake.mockSio : mta.data.getSio();

            if ( ! sio ){ return false; }//커넥션 없는 경우 메시지 전송 중단
            //if ( ! (stateMap.user && chatee )) { return false; }

            msg_map = {
                //dest_id     : chatee.id,
                //dest_name   : chatee.name,
                sender_id   : stateMap.user.id,
                sender_name : stateMap.user.name,
                msg_text    : arg_map.msg_text,
                room_id     : arg_map.room_id
            };
            console.log("send_msg",arg_map.room_id);
            //진행 중인 메시지를 볼 수 있게 updatechat를 발행
            _publish_updatechat( [msg_map] );
            sio.emit( 'updatechat', msg_map );
            return true;
        };

        //채팅방 생성을 위한 사용자ID,상대방 ID 를 서버로 메시지 전송
        set_chatee = function ( person_id ){
            var sio = isFakeData ? mta.fake.mockSio : mta.data.getSio();
            sio.on( 'roomupdate', enterRoom ); //SOCKET의 ROOMUPDATE메시지 수신 대기
            sio.emit( 'addroom', {
                name     : stateMap.people_cid_map[person_id].name+
                            ','+stateMap.user.name,
                user_id  : stateMap.user.id,
                chatee_id : person_id
            });
            return true;
        };


        update_avatar = function ( avatar_update_map ){
            var sio = isFakeData ? mta.fake.mockSio : mta.data.getSio();
            console.log('updata_avatar event', avatar_update_map)
            if ( sio ){
                sio.emit( 'updateavatar', avatar_update_map );
            }
        }

        return {
            _leave        : _leave_chat,
            get_chatee    : get_chatee,
            join          : join_chat,
            send_msg      : send_msg,
            set_chatee    : set_chatee,
            update_avatar : update_avatar
        };
    }());

    initModule = function () {
        var i, people_list, person_map;

        //익명 사용자 초기화
        stateMap.anon_user = makePerson({
            cid : configMap.anon_id,
            id  : configMap.anon_id,
            name : 'anonymous'
        });
        stateMap.user = stateMap.anon_user;
    };

    return {
        initModule : initModule,
        chat       : chat,
        people     : people
    };

}());