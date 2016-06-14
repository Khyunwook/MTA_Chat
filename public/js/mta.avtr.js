/**
 * Created by khwbori on 2016. 1. 23..
 */
/*
 * mta.avtr.js
 * Avatar 모듈
 */

/*jslint         browser : true, continue : true,
 devel  : true, indent  : 2,    maxerr   : 50,
 newcap : true, nomen   : true, plusplus : true,
 regexp : true, sloppy  : true, vars     : false,
 white  : true
 */
/*global $, mta */

mta.avtr = (function () {
    'use strict';
    //---------------- BEGIN MODULE SCOPE VARIABLES --------------
    var
        configMap = {
            chat_model   : null,
            people_model : null,

            settable_map : {
                chat_model   : true,
                people_model : true
            }
        },

        stateMap  = {
            drag_map     : null,
            $drag_target : null,
            drag_bg_color: undefined
        },

        jqueryMap = {},

        getRandRgb,
        setJqueryMap,
        updateAvatar,
        onTapNav,         onHeldstartNav,
        onHeldmoveNav,    onHeldendNav,
        onSetchatee,      onListchange,
        onLogout,
        configModule,     initModule;
    //----------------- END MODULE SCOPE VARIABLES ---------------

    //------------------- BEGIN UTILITY METHODS ------------------
    //랜덤 rgb 색상 문자열 생성 메서드
    getRandRgb = function (){
        var i, rgb_list = [];
        for ( i = 0; i < 3; i++ ){
            rgb_list.push( Math.floor( Math.random() * 128 ) + 128 );
        }
        return 'rgb(' + rgb_list.join(',') + ')';
    };
    //--------------------- BEGIN DOM METHODS --------------------
    setJqueryMap = function ( $container ) {
        jqueryMap = { $container : $container };
    };

    updateAvatar = function ( $target ){
        var css_map, person_id, room_id;

        css_map = {
            top  : parseInt( $target.css( 'top'  ), 10 ),
            left : parseInt( $target.css( 'left' ), 10 ),
            'background-color' : $target.css('background-color')
        };
        person_id = $target.attr( 'data-tid' );
        room_id = $target.attr('data-rid');

        configMap.chat_model.update_avatar({
            person_id : person_id, room_id : room_id, css_map : css_map
        });
    };
    //---------------------- END DOM METHODS ---------------------

    //-------------------이벤트 핸들러 시작 -------------------
    onTapNav = function ( event ){
        var css_map,
            $target = $( event.elem_target ).closest('.mta-avtr-box');

        if ( $target.length === 0 ){ return false; }
        $target.css({ 'background-color' : getRandRgb() });
        updateAvatar( $target );
    };

    onHeldstartNav = function ( event ){
        var offset_target_map, offset_nav_map,
            $target = $( event.elem_target ).closest('.mta-avtr-box');

        if ( $target.length === 0 ){ return false; }

        stateMap.$drag_target = $target;
        offset_target_map = $target.offset();
        offset_nav_map    = jqueryMap.$container.offset();

        offset_target_map.top  -= offset_nav_map.top;
        offset_target_map.left -= offset_nav_map.left;

        stateMap.drag_map      = offset_target_map;
        stateMap.drag_bg_color = $target.css('background-color');

        $target
            .addClass('mta-x-is-drag')
            .css('background-color','');
    };
    //사용자가 아바타를 드래그하는 동안 호출되는 메서드.
    //자주 실행되므로 계산을 최소한으로 수행
    onHeldmoveNav = function ( event ){
        var drag_map = stateMap.drag_map;
        if ( ! drag_map ){ return false; }

        drag_map.top  += event.px_delta_y;
        drag_map.left += event.px_delta_x;

        stateMap.$drag_target.css({
            top : drag_map.top, left : drag_map.left
        });
    };
    //드래그 후 사용자가 아바타를 놓을 때 호출.
    onHeldendNav = function ( event ) {
        var $drag_target = stateMap.$drag_target;
        if ( ! $drag_target ){ return false; }

        $drag_target
            .removeClass('mta-x-is-drag')
            .css('background-color',stateMap.drag_bg_color);

        stateMap.drag_bg_color= undefined;
        stateMap.$drag_target = null;
        stateMap.drag_map     = null;
        updateAvatar( $drag_target );
    };

    // 모델에서 mta-setchatee 이벤트가 발생할 때 호출.
    onSetchatee = function ( event, arg_map ) {
       /* var
            $nav       = $(this),
            room_avtr = arg_map.room_id;

        console.log( 'mta-avtr-setchatee',arg_map );
        // Use this to highlight avatar of user in nav area
        // See new_chatee.name, old_chatee.name, etc.

        // remove highlight from old_chatee avatar here
        if ( old_chatee ){
            $nav
                .find( '.mta-avtr-box[data-id=' + old_chatee.cid + ']' )
                .removeClass( 'mta-x-is-chatee' );
        }

        // add highlight to new_chatee avatar here
        if ( new_chatee ){
            $nav
                .find( '.mta-avtr-box[data-id=' + new_chatee.cid + ']' )
                .addClass('mta-x-is-chatee');
        }*/
    };

    // mta-avtrlistchange 이벤트를 발송할 때 호출. 아바타를 다시 그림
    onListchange = function ( event, arg_list ){
        console.log( 'mta-avtr-list-test',arg_list );
        var
            $nav      = $(this),
            $box,
            user = configMap.people_model.get_user(); //model의 people 객체에서 사용자 가져오기.
        $nav.empty();//
            for( var i=0; i<arg_list.talker_css.length; i++) {
                var class_list, chatee_name;
                class_list = ['mta-avtr-box'];
                console.log(user.id, arg_list.talker_css[i].t_id );
                if(user.id === arg_list.talker_css[i].t_id)
                {
                    class_list.push('mta-x-is-user');
                }else {
                    class_list.push('mta-x-is-chatee');
                }
                chatee_name =configMap.people_model.get_by_cid(arg_list.talker_css[i].t_id).name;
                //model의 people 객체에서 해당 id에 해당하는 person객체 가져오기.
                $box = $('<div/>')
                    .addClass(class_list.join(' '))
                    .css(arg_list.talker_css[i].css_map)
                    .attr('data-tid', String(arg_list.talker_css[i].t_id))
                    .attr('data-rid', String(arg_list._id))
                    .prop('title', mta.util_b.encodeHtml(chatee_name))
                    .append('<img>')
                    .append('<p>'+chatee_name+'</p>')
                    .appendTo($nav);
            }
    };

    onLogout = function (){
        jqueryMap.$container.empty();
    };
    //-------------------- 이벤트 핸들러 끝 --------------------

    //------------------- BEGIN PUBLIC METHODS -------------------

    configModule = function ( input_map ) {
        mta.util.setConfigMap({
            input_map    : input_map,
            settable_map : configMap.settable_map,
            config_map   : configMap
        });
        return true;
    };

    initModule = function ( $container ) {
        setJqueryMap( $container );

        // bind model global events
       // $.gevent.subscribe( $container, 'mta-setchatee',  onSetchatee  );
        $.gevent.subscribe( $container, 'mta-avtrlistchange', onListchange );
        $.gevent.subscribe( $container, 'mta-logout',     onLogout     );

        // bind actions
        $container
            .bind( 'utap',       onTapNav       )
            .bind( 'uheldstart', onHeldstartNav )
            .bind( 'uheldmove',  onHeldmoveNav  )
            .bind( 'uheldend',   onHeldendNav   );

        return true;
    };
    // End public method /initModule/

    // return public methods
    return {
        configModule : configModule,
        initModule   : initModule
    };
    //------------------- END PUBLIC METHODS ---------------------
}());
