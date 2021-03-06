/**
 * Created by khwbori on 2016. 1. 22..
 */
/*
    mta.chat.js
    채팅 기능 모듈
 */

/*jslint         browser : true, continue : true,
 devel  : true, indent  : 2,    maxerr   : 50,
 newcap : true, nomen   : true, plusplus : true,
 regexp : true, sloppy  : true, vars     : false,
 white  : true
 */
/*global $, mta, getComputedStyle */

mta.chat = ( function () {
  //-------------모듈 스코프 변수 시작 -----------------
    var
        configMap = {
            main_html : String()
            +'<div class="mta-chat">'
                +'<div class="mta-chat-head">'
                    +'<div class="mta-chat-head-toggle"><</div>'
                    +'<div class="mta-chat-head-nav">'
                        +'<div class="mta-chat-head-nav-flist">F</div>'
                        +'<div class="mta-chat-head-nav-chatlist">Chat</div>'
                    +'</div>'
                +'</div>'
                +'<div class="mta-chat-content">'
                    +'<div class="mta-chat-content-flist">'
                        +'<div class="mta-chat-content-flist-head"><p>현재 접속자</p></div>'
                        +'<div class="mta-chat-content-flist-box">'
                        +'</div>'
                    +'</div>'
                    +'<div class="mta-chat-content-chatlist">'
                        +'<div class="mta-chat-content-chatlist-head"></div>'
                        +'<div class="mta-chat-content-chatlist-box"></div>'
                    +'</div>'
                    +'<div class="mta-chat-content-chatw">'
                        +'<div class="mta-chat-content-chatw-head">'
                            +'<div class="mta-chat-content-chatw-head-title"></div>'
                        +'</div>'
                        +'<div class="mta-chat-content-chatw-sizer">'
                            +'<div class="mta-chat-msgs">'
                                +'<div class="mta-chat-msg-log"></div>'
                            +'</div>'
                            +'<form class="mta-chat-msg-form">'
                                +'<input type="text"/>'
                                +'<input type="submit" style="display:none"/>'
                                +'<div class="mta-chat-msg-send">send</div>'
                            +'</form>'
                        +'</div>'
                    +'</div>'
                +'</div>'
            +'</div>',

            settable_map : {
                slider_open_time    : true,
                slider_close_time   : true,
                slider_open_em      : true,
                slider_closed_em    : true,
                slider_opened_title : true,
                slider_closed_title : true,

                chat_model          : true,
                people_model        : true,
                set_chat_anchor     : true
            },

            slider_open_time        : 250,
            slider_close_time       : 250,
            slider_opened_em        : 25,
            slider_closed_em        : 0,
            slider_opend_title      : 'Tap to close',
            slider_closed_title     : 'Tap to open',

            chat_model              : null,
            people_model            : null,
            set_chat_anchor         : null
        },
        stateMap = {
            $append_target   : null,
            position_type    : 'closed',
            px_per_em        : 0,
            slider_hidden_px : 0,
            slider_closed_px : 0,
            slider_opened_px : 0
        },
        jqueryMap = {},
        setJqueryMap,  setPxSizes,  scrollChat,
        writeChat, writeChatBottom,  writeAlert,  clearChat,
        setSliderPosition,
        onTapToggle,   onSubmitMsg,  onTapList,
        onSetchatee,   onUpdatechat, onListchange,
        onLogin,       onLogout,
        onTapflist,    onTapclist, onUpdateRoadchat,
        configModule, initModule,
        removeSlider
    ;
  //-------------모듈 스코프 변수 끝-------------------

  //-------------유틸리티 메서드 시작--------------------
  //-------------유틸리티 메서드 끝---------------------

  //--------------DOM 메서드 시작-----------------------
    //DOM 메서드 /setJqueryMap/ 시작
    setJqueryMap = function (){
        var
            $append_target = stateMap.$append_target,
            $slider = $append_target.find( '.mta-chat' );
        jqueryMap = {
            $slider     : $slider,
            $head       : $slider.find( '.mta-chat-head'),
            $toggle     : $slider.find( '.mta-chat-head-toggle'),
            $nav_flist  : $slider.find( '.mta-chat-head-nav-flist'),
            $nav_clist  : $slider.find( '.mta-chat-head-nav-chatlist'),

            $content    : $slider.find( '.mta-chat-content'),
            $flist      : $slider.find( '.mta-chat-content-flist'),
            $flist_box  : $slider.find( '.mta-chat-content-flist-box'),
            $clist      : $slider.find( '.mta-chat-content-chatlist'),
            $clist_box  : $slider.find( '.mta-chat-content-chatlist-box'),

            $chatw      : $slider.find( '.mta-chat-content-chatw'),
            $chat_head  : $slider.find( '.mta-chat-content-chatw-head'),
            $chat_head_title :$slider.find( '.mta-chat-content-chatw-head-title'),
            $sizer      : $slider.find( '.mta-chat-content-chatw-sizer'),
            $msgs       : $slider.find( '.mta-chat-msgs' ),
            $msg_log    : $slider.find( '.mta-chat-msg-log'),
            $msg_form   : $slider.find( '.mta-chat-msg-form' ),
            $input      : $slider.find( '.mta-chat-msg-form input[type=text]'),
            $send       : $slider.find( '.mta-chat-msg-send'),

            $window     : $(window)
        };
    };
    //DOM 메서드 /setJqueryMap/ 끝

    //DOM메서드 /setPxSizes /시작
    setPxSizes = function(){
        var px_per_em, window_width_em, opened_width_em;
        px_per_em = mta.util_b.getEmSize(jqueryMap.$slider.get(0));
        //console.log(px_per_em);
        //window_width_em = Math.floor(($(window).width()/px_per_em)+0.5);
        opened_width_em = configMap.slider_opened_em;
        stateMap.px_per_em = px_per_em;
        stateMap.slider_closed_px = configMap.slider_closed_em * px_per_em;
        stateMap.slider_opened_px = opened_width_em * px_per_em;
        jqueryMap.$content.css({
            width  : ( opened_width_em-50/16 )* px_per_em
        });

    };
    //DOM메서드 /setPxSizes/ 끝

    setSliderPosition = function(position_type, callback){
        var
            width_px, animate_time, toggle_text;
        //익명 사용자는 'opened' 위치 타입을 사용할 수 없다.
        //따라서 이때는 false를 반환. 그럼 셸에서 uri를 수정
        if( position_type === 'opened' && configMap.people_model.get_user().get_is_anon() ){
            return false;
        }

        //슬라이더가 이미 요청한 위치에 있으면 true를 반환
        if(stateMap.position_type === position_type){
            if( position_type === 'opened' ){
                jqueryMap.$input.focus();
            }
            return true;
        }

        //애니메이션 파라미터를 준비
        switch (position_type){
            case 'opened' :
                width_px = stateMap.slider_opened_px;
                animate_time = configMap.slider_open_time;
                toggle_text = '>';
                break;
            case 'hidden':
                width_px=0;
                animate_time=configMap.slider_open_time;
                toggle_text='<';
                break;
            case 'closed':
                width_px = stateMap.slider_closed_px;
                animate_time = configMap.slider_close_time;
                toggle_text ='<';
                break;

            // 알지 못하는 position_type에 대해서는 false를 반환
            default : return false;
        }

        //슬라이더 위치 변경 애니메이션
        stateMap.position_type='';
        jqueryMap.$slider.animate(
            { width : width_px+10 },
            animate_time,
            function(){
                jqueryMap.$toggle.text(toggle_text);
                stateMap.position_type=position_type;
                if( callback ) { callback( jqueryMap.$slider ); }
            }
        );
        return true;
    };
    //public DOM 메서드 /setSliderPosition/ 끝

    // 채팅 메시지 관리를 위한 private DOM 메서드 시작
    //텍스트가 전송됨에 따라 메시지가 부드럽게 스크롤되게 해주는 메서드
    scrollChat = function () {
        var $msg_log = jqueryMap.$msg_log;
        $msg_log.animate(
            {
                scrollTop : $msg_log.prop( 'scrollHeight' )
                -$msg_log.height()
            },
            150
        );
    };

    //메시지 로그 첨부하는 메서드, 사용자 메시지일 경우 다른 스타일 사용
    writeChat = function ( person_name, text, is_user ){
        var msg_class = is_user ? 'mta-chat-msg-log-me' : 'mta-chat-msg-log-msg';

        jqueryMap.$msg_log.append(
            '<div class="' + msg_class + '"><div class ="chatname">'
            + mta.util_b.encodeHtml( person_name ) + ':</div>'
            + mta.util_b.encodeHtml( text) + '</div>'
        );
        scrollChat();
    };

    writeChatBottom = function ( person_name, text, is_user ){
        var msg_class = is_user ? 'mta-chat-msg-log-me' : 'mta-chat-msg-log-msg';

        jqueryMap.$msg_log.append(
            '<div class="' + msg_class + '"><div class="chatname">'
            + mta.util_b.encodeHtml( person_name ) + ': </div>&nbsp;&nbsp;'
            + mta.util_b.encodeHtml(text) + '&nbsp;&nbsp;</div>'
        );
    };


    //시스템 굥고를 메시지 로그에 첨부
    writeAlert = function ( alert_text ){
        jqueryMap.$msg_log.append(
            '<div class="mta-chat-msg-log-alert">'
                + mta.util_b.encodeHtml( alert_text )
            +'</div>'
        );
        scrollChat();
    };

    //메시지 로그 제거
    clearChat = function () { jqueryMap.$msg_log.empty(); };
    //채팅 메시지 관리를 위한 private DOM 메서드 끝
  //--------------DOM 메서드 끝------------------------

  //--------------이벤트 핸들러 시작----------------------
    onTapToggle = function(event){
        var set_chat_anchor = configMap.set_chat_anchor;
        console.log(set_chat_anchor);
        if(stateMap.position_type === 'opened'){
            set_chat_anchor('closed');
        }
        else if(stateMap.position_type ==='closed'){
            set_chat_anchor('opened');
        }
        return false;
    };

    //사용자 이벤트 처리할 메서드. send_msg 메서드를 사용해 전송
    onSubmitMsg = function ( event ) {
        var msg_map = {};
        msg_map.msg_text=jqueryMap.$input.val();
        msg_map.room_id = jqueryMap.$chatw.attr('data-id');
        console.log('test',msg_map.room_id);
        if ( msg_map.msg_text.trim() === '' ) { return false; }
        configMap.chat_model.send_msg( msg_map );
        jqueryMap.$input.focus();
        jqueryMap.$send.addClass( 'mta-x-select' );
        setTimeout(
            function () { jqueryMap.$send.removeClass( 'mta-x-select' );},
            250
        );
        return false;
    };

    //사람의 이름을 클릭하면 사용자 생성 이벤트를 위한 핸들러 (룸생성)
    onTapList = function ( event ){
        var $tapped = $( event.elem_target)//채팅 상대, chatee_id;
        if( !$tapped.hasClass( 'mta-chat-flist-name' ) ) { return false; }

        chatee_id = $tapped.attr( 'data-id' ); //DIV 의 속성으로 저장된
                                                // 채팅 상대의 ID
        if ( ! chatee_id ) { return false; }
        configMap.chat_model.set_chatee( chatee_id );
        return false;
    };

    // 'mta-setchatee' 이벤트 처리. 슬라이더 제목변경. 채팅방 DOM생성
    onSetchatee = function ( event, arg_map ){
        var
            list_html = String();
        jqueryMap.$flist.css('left', 300); //채팅방으로 화면 전환.
        jqueryMap.$chatw.css('left', 0);
        //메시지 비우기
        jqueryMap.$msg_log.empty();

        list_html //채팅방 목록 생성
            +='<div class="mta-chat-chatlist-name" data-id='+arg_map.room_id+'">'
            + mta.util_b.encodeHtml(arg_map.room_name) + '</div>';
        jqueryMap.$chatw.attr('data-id',arg_map.room_id);
        jqueryMap.$chat_head_title.text(arg_map.room_name+'님과의 채팅방');
        //채팅 목록이 없을 때
        if( !list_html ){
        }
        jqueryMap.$clist_box.html(list_html); //채팅방 목록 바인딩
    };

    //'mta-listchange' 이벤트 처리. 현재 사람들 컬렉션을 가져와 사람들 목록을 랜더링.
    onListchange = function ( event ){
        var
            list_html = String(),
            people_db = configMap.people_model.get_db(),
            chatee = configMap.chat_model.get_chatee();
        people_db().each( function ( person, idx ){
            var select_class = '';

            list_html
                +='<div class="mta-chat-flist-name" data-id="'+ person.id +'">'
                + mta.util_b.encodeHtml( person.name ) + '</div>';
        });

        //친구 목록이 없을때
        if( !list_html ){

        }
        jqueryMap.$flist_box.html(list_html);
    };

    //'mta-updatechat' 이벤트를 처리하기위한 메서드. 메시지 로그 디스플레이 업데이트.
    onUpdatechat = function ( event, msg_map ){
        var
            is_user,
            sender_id = msg_map.sender_id,
            msg_text = msg_map.msg_text,
            //chatee = configMap.chat_model.get_chatee() || {},
            sender = configMap.people_model.get_by_cid( sender_id );
            console.log('sender',sender);
        if ( !sender ){
            writeAlert( msg_text );
            return false;
        }
        is_user = sender.get_is_user();
        /*
        if( !( is_user || sender_id === chatee.id ) ){
            configMap.chat_model.set_chatee( sender_id );
        }*/
        writeChat( sender.name, msg_text, is_user );

        if (is_user ){
            jqueryMap.$input.val('');
            jqueryMap.$input.focus();
        }
    };
    onUpdateRoadchat = function ( event, msg_list ){
        var is_user, sender_id;
        console.log(msg_list[0].length);
        for(var i=0; i<msg_list[0].length; i++){
            sender_id = msg_list[0][i].sender_id;
            if(sender_id === configMap.people_model.get_user().id){
                is_user = true; // 메시지 발송자의 id와 현재 클라이언트 사용자 id 비교
            }else{ is_user = false; } //발송자가 사용자 id 이면 is_user에 따라 새로운 css랜더링
            writeChatBottom ( msg_list[0][i].sender, msg_list[0][i].msg, is_user );
            //불러온 채팅 내역을 writeChatBottom 으로 채팅창에 랜더링
        }
        jqueryMap.$msg_log.scrollTop(jqueryMap.$msg_log.height());
        console.log(jqueryMap.$msg_log.height());
    };

    //'mta-login' 이벤트를 처리할 메서드
    onLogin = function ( event, login_user ){
        configMap.set_chat_anchor( 'opened' );
    };

    //'mta-logout' 이벤트를 처리할 메서드
    onLogout = function ( event, logout_user ){
        configMap.set_chat_anchor( 'closed' );
    };

    onTapflist = function ( event ){
        jqueryMap.$flist.css('left', 0);
       // jqueryMap.$clist.css('left', 300);
        jqueryMap.$chatw.css('left', 300);
        return false;
    };
    onTapclist =function ( event ){
        //jqueryMap.$clist.css('left', 0);
        jqueryMap.$chatw.css('left', 0);
        jqueryMap.$flist.css('left', 300);
        return false;
    };
  //--------------이벤트 핸들러 끝-----------------------

  //---------------public 메서드 시작--------------------
    //public 메서드 /configModule/ 시작
    configModule = function ( input_map ){
      mta.util.setConfigMap({
          input_map     : input_map,
          settable_map  : configMap.settable_map,
          config_map    : configMap
      });
      return true;
    };
    //public 메서드 /configModule/ 끝

    //public 메서드 /initModule/ 시작
    //
    initModule = function($append_target){
        var $content;

        //채팅 슬라이더 html 및 제이쿼리 캐시 로드
        stateMap.$append_target = $append_target;
        $append_target.append(configMap.main_html);
        setJqueryMap();
        setPxSizes();
       // jqueryMap.$msg_log.scrollTop = jqueryMap.$msg_log.scrollHeight;
        stateMap.position_type='closed';

        //$content가 제이쿼리 전역 이벤트를 구독하게 함
        $content = jqueryMap.$content;
        $.gevent.subscribe ( $content, 'mta-listchange' ,onListchange );
        $.gevent.subscribe ( $content, 'mta-setchatee' ,onSetchatee );
        $.gevent.subscribe ( $content, 'mta-updatechat' ,onUpdatechat );
        $.gevent.subscribe ( $content, 'mta-updateroadchat' ,onUpdateRoadchat);
        $.gevent.subscribe ( $content, 'mta-login', onLogin );
        $.gevent.subscribe ( $content, 'mta-logout', onLogout );

        //사용자 입력 이벤트 바인딩
        jqueryMap.$toggle.bind( 'utap', onTapToggle );
        jqueryMap.$flist_box.bind('utap', onTapList );
        jqueryMap.$send.bind( 'utap', onSubmitMsg );
        jqueryMap.$msg_form.bind( 'submit', onSubmitMsg );
        jqueryMap.$nav_flist.bind( 'utap', onTapflist );
        jqueryMap.$nav_clist.bind( 'utap', onTapclist );

        return true;
    };
    //public 메서드 /initModule/ 끝

    //public 메서드 /removeSlider/ 시작
    removeSlider = function () {
        //초기화 및 상태 복원
        // DOM 컨테이너 제거. 컨테이너를 제거하면 이벤트 바인딩도 함께 제거된다.
        if( jqueryMap.$slider ){
            jqueryMap.$slider.remove();
            jqueryMap = {};
        }
        stateMap.$append_target = null;
        stateMap.position_type = 'closed';

        //키 설정 초기화
        configMap.chat_model = null;
        configMap.people_model = null;
        configMap.set_chat_anchor = null;

        return true;
    };
    //public 메서드 /removeSlider/ 끝

    //public 메서드 반환
    return {
        setSliderPosition : setSliderPosition,
        configModule      : configModule,
        initModule        : initModule,
        removeSlider      : removeSlider
    };

  //---------------public 메서드 끝---------------------

}());