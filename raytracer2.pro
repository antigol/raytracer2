#-------------------------------------------------
#
# Project created by QtCreator 2013-01-27T17:09:15
#
#-------------------------------------------------

QT       += core gui opengl

greaterThan(QT_MAJOR_VERSION, 4): QT += widgets

TARGET = raytracer2
TEMPLATE = app


SOURCES += main.cpp\
        widget.cpp

HEADERS  += widget.h

OTHER_FILES += \
    raytracer.frag \
    raytracer.vert

RESOURCES += \
    res.qrc
