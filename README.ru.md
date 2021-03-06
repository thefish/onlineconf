# OnlineConf

OnlineConf - это система конфигурирования уровня приложения, созданная для того, чтобы помочь разработчикам и менеджерам web-сервисов и приложений оперативно менять их поведение.

OnlineConf спроектирован с учетом требований горизонтальной масштабируемости и отказоустойчивости, рассчитан на хранение достаточно большого количества конфигурационных параметров. Чтение параметров конфигурации приложением осуществляется локально из memory mapped файлов, организованных в виде constant database, что не требует сетевых запросов и не вносит дополнительной точки отказа, а также позволяет эффективно читать только необходимые данные без парсинга файлов целиком.

Создателем OnlineConf является компания Mail.Ru, система успешно применяется с 2011 года для конфигурирования нагруженных проектов, развернутых на тысячах серверов.

![Скриншот](screenshot.png)

## Особенности

* Доступность конфигурации вне зависимости от сетевой доступности/работоспособности OnlineConf;
* Быстрый индексированный доступ к параметрам конфигурации из приложения;
* Структурированное хранение конфигурации в виде дерева параметров;
* Поддержка как простых текстовых параметров, так и JSON/YAML;
* Поддержка символических ссылок на параметры (поведение аналогично симлинкам в Unix-системах);
* Возможность варьировать значение отдельных параметров и целых поддеревьев параметров в зависимости от hostname сервера, его IP адреса или реквизитов;
* Наличие панели управления, позволяющей модифицировать конфигурацию без наличия умений программиста, devops или системного администратора;
* Наличие API, позволяющего осуществлять автоматизированное изменение параметров;
* Возможность разграничивать доступ на чтение/запись как отдельных параметров, так и целых поддеревьев;
* Хранение истории изменения параметров, а также возможность подключить нотификации об изменении параметров.

## Установка

### Попробовать в Docker

Запустить базу данных, API и панель управления:

```sh
cd admin
docker-compose up
```

База данных будет инициализирована демонстрационным конфигом, панель управления и API будут доступны по адресу http://localhost.

Демо показывает достаточно сложный случай, когда одна инсталляция OnlineConf используется для управления несколькими независимыми проектами (для одного проекта структура проще): *gopher* и *squirrel*. У каждого из проектов свой кластер серверов, на которых они развернуты, свои группы пользователей для управления.

Для демонстрационных целей созданы следующие пользователи (пароль совпадает с именем пользователя):
* `admin` - пользователь с полными правами (входит в группу `root`);
* `hedgehog` - системный администратор (группа `sysadmin`);
* `meerkat` - разработчик проекта gopher (группа `gopher-developer`);
* `rabbit` - разработчик проекта squirrel (группа `squirrel-developer`);
* `beaver` - менеджер проекта squirrel (группа `squirrel-manager`).

Принадлежность сервера к проекту в демо определяется по реквизитам, с которыми *onlineconf-updater* подключается к *onlineconf-admin* (см. ветку конфигурации `/onlineconf/service`, пароли совпадают с именами пользователей).

Запустить агент, обновляющий конфиги на конечном сервере:

```sh
cd updater
docker-compose up
```

По умолчанию запустится *onlineconf-updater* для проекта gopher, чтобы запустить агент для squirrel надо поправить реквизиты в [docker-compose.yml](updater/docker-compose.yml). Выгруженные конфигурационные файлы можно посмотреть в директории `./updater/data` на хост-машине (смонтирована в контейнер как `/usr/local/etc/onlineconf`).

Проекты gopher и squirrel специально сконфигурированы по-разному. Gopher следует по пути одного логически структурированного конфига, которым пользуется все сервисы, запущенные на сервере. Squirrel же, напротив, настроен таким образом, что у каждого сервиса на сервере свой отдельный конфигурационный файл.

### Запустить в production

Собрать, настроить и запустить сервисы `onlineconf-admin` и `onlineconf-updater` очень просто. Необходимая для запуска `onlineconf-admin` информация есть в [admin/docker-compose.yml](admin/docker-compose.yml), [admin/Dockerfile](admin/Dockerfile), а также в [admin/SPECS/onlineconf-admin.spec](admin/SPECS/onlineconf-admin.spec).
Для запуска `onlineconf-updater` см. аналогичные файлы в директории updater: [updater/docker-compose.yml](updater/docker-compose.yml), [updater/Dockerfile](updater/Dockerfile) и [updater/SPECS/onlineconf-updater.spec](updater/SPECS/onlineconf-updater.spec).

`onlineconf-admin` может либо быть расположен за reverse proxy (nginx, например), либо отдавать статику и терменировать TLS самостоятельно. В любом случае, для production использование TLS обязательно.

## Архитектура

OnlineConf состоит из двух компонентов: `onlineconf-admin` и `onlineconf-updater`.

### onlineconf-admin

Основной компонент системы, реализующий всю логику работы с конфигурациями, предоставляет API для редактирования конфигурации, API для раздачи конфигурации на серверы, а также панель управления.

Для хранения данных используется БД MySQL, она привычна большинству системных администраторов, они умеют ее правильно настраивать, реплицировать, бэкапить.
Backend сервиса реализован на Go, frontend на TypeScript, взаимодействие между ними осуществляется по REST API, которое также можно использовать для автоматизации.

### onlineconf-updater

Демон, запускаемый на каждом из серверов, до которых необходимо доставлять конфигурацию. Отвечает за обновление локальных файлов конфигурации данными из onlineconf-admin. Периодически опрашивает onlineconf-admin на предмет наличия изменений и, если необходимо, записывает новую конфигурацию в локальные файлы в двух форматах: *conf* и *cdb*.

Формат *conf* исторический, появился в самой первой версии OnlineConf, рекомендуется его применять только для небольших конфигураций. Представляет собой простой текстовый файл, в котором в каждой строке записано имя параметра и его значение.

Поддержка формата *cdb* появилась в момент, когда стало понятно, что перечитывание конфигурации, при ее изменении, из текстового файла требует значительного времени. Рекомендуется использовать именно его, описание формата доступно на сайте его автора: http://cr.yp.to/cdb.html

Демон написан на Go, не имеет зависимостей и легко деплоится на любую систему.

## Типы данных

* Null - ключ не имеет значения, эквивалентно отсутствию ключа;
* Text - текст, может быть многострочным;
* JSON - поле в формате JSON;
* YAML - поле, хранимое, редактируемое и отображаемое в формате YAML. Приложение получит его преобразованным в формат JSON, это связано с более широкой поддержкой этого формата библиотеками разных языков;
* Template - шаблон текста, в который могут быть подставлены либо другие параметры конфигурации либо hostname/ip сервера, на который выгружается конфигурация;
* Symlink - символическая ссылка на другой параметр, аналог симлинков unix-систем;
* Case - работает как оператор switch, в зависимости от условия параметр принимает одно из значений;
* Различные виды списков: простой список через запятую, список пар ip:port через запятую и список пар ip:ports через точку с запятой (порты через запятую).

## Система прав

Для каждого параметра можно задать, какая группа пользователей имеет право его просматривать и редактировать. Права дочерними параметрами дерева наследуются от родительских элементов. Делегирование доступа доступно тем же пользователям, которым доступно редактирование.

В системе есть специальная группа `root`, к ней привязаны некоторые дополнительные возможности, в том числе право на управление группами пользователей.

## Особые параметры

В дереве конфигурации OnlineConf есть специальная ветка `/onlineconf`. Она используется для конфигурирования поведения самого OnlineConf и позволяет делать некоторые интересные штуки.

### /onlineconf/module

`/onlineconf/module` - эта ветка важнейшая, именно она, а не корень дерева, является началом начал конфигураций, выгружаемых на серверы. Каждый непосредственный дочерний элемент этой ветки становится отдельным файлом конфигурации, а все поддерево этого дочернего элемента - содержимым файла.

В самом простом случае, эта ветка имеет один дочерний элемент - `/onlineconf/module/TREE`, значением которого является ссылка на корень дерева. Это приводит к тому, что на серверы выгружаются файлы `/usr/local/etc/onlineconf/TREE.{cdb,conf}`, содержащие все дерево OnlineConf. Но возможны и более интересные варианты.

Например, в качестве значения параметра `/onlineconf/module` можно использовать Case, который в зависимости от группы, к которой принадлежит сервер, будет иметь значением симлинк на разные поддеревья параметров. Это приведет к тому, что на эти серверы будут выгружены принципиально разные конфигурации. Этот подход удобно использовать для того, чтобы при помощи одной инсталляции OnlineConf управлять несколькими проектами.

Если на одном сервере сосуществуют несколько сервисов, для которых лучше иметь разные конфигурационные файлы, то в `/onlineconf/module` можно создать по поддереву для каждого из них.

Значения параметров `/onlineconf/module` и `/onlineconf/module/${modulename}` используются *onlineconf-updater* для конфигурирования выгрузки файлов, причем в `/onlineconf/module` можно сконфигурировать поведение для всех модулей, а в `/onlineconf/module/${modulename}` для конкретного. Значение должно быть типа YAML или JSON и содержать map параметров.
На данный момент поддерживается один параметр - `delimiter`, позволяющий сконфигурировать разделитель, используемый в именах параметров, который может принимать одно из значений: `/` или `.`. Для новых инсталляций OnlineConf рекомендуется задать разделитель явно (в `/onlineconf/module`), в противном случае будет использоваться режим совместимости, в котором для модуля `TREE` будет использоваться разделитель `/`, а для всех остальных - `.`.

### /onlineconf/service

`/onlineconf/service` - список аккаунтов, под которыми могут авторизовываться *onlineconf-updater*. Также служат одним из условий для Case. Имя параметра - имя пользователя, значение - SHA256 от пароля.

### /onlineconf/group

`/onlineconf/group` - группировка серверов по их имени. Имя параметра - имя группы, значение - *glob* (примерно как в `bash`) hostname серверов, входящих в эту группу. Синтаксис глобов описан здесь: https://github.com/gobwas/glob

`/onlineconf/group/priority` - список групп через запятую в порядке убывания приоритета. По умолчанию группы сортируются по алфавиту, все неуказанные в данном списке группы добавляются либо в конец списка либо вместо плейсхолдера `*`. Приоритеты нужны в тех случаях, когда сервер одновременно входит в несколько групп, для которых какой-либо из параметров имеет разное значение.

### /onlineconf/datacenter

`/onlineconf/datacenter` - группировка серверов по IP адресу. Имя параметра - имя группы, значение - список сетей через запятую.

### /onlineconf/suspended

`/onlineconf/suspended` - приостановить выгрузку обновлений конфигурации на серверы в случае, если значение истинно (не типа `Null`, не `""` и не `"0"`). Удобно использовать для того, чтобы организовывать транзакционное изменение множества параметров. Начало транзакции - установка этого параметра в истину, конец - в ложь. Также можно использовать для того, чтобы опасные правки конфигурации испытывать на небольшом наборе серверов.

## Чтение конфигурации из приложения

Для нескольких языков уже есть готовые библиотеки: [Go](https://github.com/onlineconf/onlineconf-go), [Swift](https://github.com/onlineconf/onlineconf-swift), [Perl](https://github.com/onlineconf/onlineconf-perl), [Python](https://github.com/onlineconf/onlineconf-python) и [Node.js](https://github.com/onlineconf/onlineconf-nodejs).

Но, если необходимо это делать из другого языка, то это просто, достаточно, чтобы для него была библиотека работы с файлами в формате CDB. Алгоритм чтения параметров примерно такой:

* Если CDB-файл еще не открыт, то открыть на чтение, он будет c`mmap`лен в память, запомнить его `mtime`, если открыт, то сверить сохраненный `mtime` со временем файла на диске и, если не совпадает, то переоткрыть и сбросить кэши десериализованных JSON.
* Прочитать ключ по имени параметра. В первом байте значения - идентификатор типа: `s` - текстовое поле, `j` - JSON. В остальных - собственно значение.
* Для строки - отдать приложению ее копию, для JSON - десериализовать и отдать структуру, закэшировать ее.

## Общие рекомендации

OnlineConf в силу наличия симлинков и кейсов обладает большой гибкостью. За время использования этой системы в Mail.Ru у нас выработались некоторые правила организации дерева конфигурации, которые могут оказаться удобными не только для нас:

* *Размещение параметров в дереве, исходя из закладываемой в них логики, а не из того, как их надо выгружать в файлы.* Параметры лучше группировать в дереве логически, это упрощает понимание конфигурации и делегирование прав. Для того же, чтобы добиться правильного размещения параметров по файлам, использовать симлинки. Это особенно актуально для параметров, которые используются из разных подсистем.

* *На верхнем уровне дерева каждый элемент соответствует отдельному проекту. Каждому проекту свой chroot.* В `/onlineconf/module` размещается Case из симлинков, для каждого из проектов ведущих в свой `/onlineconf/chroot/${projectname}`. В `/onlineconf/chroot/${projectname}/TREE/${projectname}` размещается ссылка на `/${projectname}`. Это приводит к тому, что у каждого проекта своя конфигурация и при этом пути к параметрам в файле на сервере и в дереве OnlineConf совпадают.

* *Инфраструктура отдельно.* Параметры, которыми должны управлять системные администраторы (адреса баз, сервисов, реквизиты, токены и пр.), размещаются в отдельной иерархии `/infrastructure`. Эта иерархия доступна на чтение и запись только системным администраторам, напрямую нигде не используется, только через симлинки из нужных мест в логической иерархии проектов.
