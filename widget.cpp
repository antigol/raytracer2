#include "widget.h"
#include <QMatrix4x4>
#include <cmath>

Widget::Widget(QWidget *parent)
    : QGLWidget(parent)
{
    _program = new QGLShaderProgram(this);
    startTimer(20);
    _fpsid = startTimer(1000);
    _fps = 0;
    t.start();
    angle1 = angle2 = 0.0;
    zoom = 1.428;
    camera = QVector3D(0.0, 0.0, 0.0);
}

Widget::~Widget()
{
    glDeleteTextures(1, &textureId);
}

#define PROGRAM_VERTEX_ATTRIBUTE 0

void Widget::initializeGL()
{
    qDebug() << ":1";
    _program->addShaderFromSourceFile(QGLShader::Vertex, ":/glsl/raytracer.vert");
    _program->addShaderFromSourceFile(QGLShader::Fragment, ":/glsl/raytracer_inline.frag");
    _program->bindAttributeLocation("vertex", PROGRAM_VERTEX_ATTRIBUTE);
    qDebug() << ":2";
    _program->link();
    qDebug() << ":3";
    _program->bind();
    qDebug() << ":4";

    _program->setUniformValue("eye", QVector3D(0.0, 0.0, -1.0));
    _program->setUniformValue("up", QVector3D(0.0, 1.0, 0.0));
    _program->setUniformValue("anglevalue", 1.428f);
    _program->setUniformValue("camera", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("light", QVector3D(0.0, 1.0, 0.1).normalized());

    // en mouvement
//    _program->setUniformValue("spheres[0].center", QVector3D(0.0, 0.0, -3.0));
    _program->setUniformValue("spheres[0].radius", 1.0f);
    _program->setUniformValue("spheres[0].mat.phong_factor", 0.0f);
    _program->setUniformValue("spheres[0].mat.ambiant", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("spheres[0].mat.diffuse", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("spheres[0].mat.eta", 1.3f);

    // gris
    _program->setUniformValue("spheres[1].center", QVector3D(-1.5, 2.0, -5.5));
    _program->setUniformValue("spheres[1].radius", 1.0f);
    _program->setUniformValue("spheres[1].mat.phong_factor", 0.7f);
    _program->setUniformValue("spheres[1].mat.ambiant", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("spheres[1].mat.diffuse", QVector3D(0.6, 0.6, 0.6));
    _program->setUniformValue("spheres[1].mat.eta", 0.0f);

    // vert
    _program->setUniformValue("spheres[2].center", QVector3D(2.5, 0.0, -5.5));
    _program->setUniformValue("spheres[2].radius", 1.0f);
    _program->setUniformValue("spheres[2].mat.phong_factor", 0.2f);
    _program->setUniformValue("spheres[2].mat.ambiant", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("spheres[2].mat.diffuse", QVector3D(0.1, 1.0, 0.0));
    _program->setUniformValue("spheres[2].mat.eta", 0.0f);

    // blanc
    _program->setUniformValue("spheres[3].center", QVector3D(-2.5, -1.5, -5.5));
    _program->setUniformValue("spheres[3].radius", 1.0f);
    _program->setUniformValue("spheres[3].mat.phong_factor", 0.7f);
    _program->setUniformValue("spheres[3].mat.ambiant", QVector3D(0.5, 0.5, 0.5));
    _program->setUniformValue("spheres[3].mat.diffuse", QVector3D(1.0, 1.0, 1.0));
    _program->setUniformValue("spheres[3].mat.eta", 0.0f);

    _program->setUniformValue("spheres[4].radius", 0.0f);

    _program->setUniformValue("planes[0].point", QVector3D(-3.5, -2.5, -6.5));
    _program->setUniformValue("planes[0].normal", QVector3D(0.0, 1.0, 0.0));
    _program->setUniformValue("planes[0].width", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("planes[0].height", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("planes[0].mat.phong_factor", 0.8f);
    _program->setUniformValue("planes[0].mat.ambiant", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("planes[0].mat.diffuse", QVector3D(0.5, 0.2, 0.1));
    _program->setUniformValue("planes[0].mat.eta", 0.0f);

    _program->setUniformValue("planes[1].mat.eta", -1.0f);

    _program->setUniformValue("cubemap", 0);

    QImage img(":/tex/skybox_texture2.jpg");
    img = img.convertToFormat(QImage::Format_ARGB32).rgbSwapped();

    glActiveTexture(GL_TEXTURE0);
    glEnable(GL_TEXTURE_CUBE_MAP);
    glGenTextures(1, &textureId);
    glBindTexture(GL_TEXTURE_CUBE_MAP, textureId);
    glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_EDGE);

    GLsizei w = img.width() / 4;
    GLsizei h = w;
    glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, img.copy(2*w, h, w, h).bits());
    glTexImage2D(GL_TEXTURE_CUBE_MAP_NEGATIVE_X, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, img.copy(0, h, w, h).bits());
    glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_Y, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, img.copy(w, 0, w, h).bits());
    glTexImage2D(GL_TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, img.copy(w, 2*h, w, h).bits());
    glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_Z, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, img.copy(w, h, w, h).bits());
    glTexImage2D(GL_TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, img.copy(3*w, h, w, h).bits());
}

void Widget::resizeGL(int w, int h)
{
    _program->setUniformValue("aspect", h? GLfloat(w)/GLfloat(h) : 1.0f);
    glViewport(0, 0, w, h);
}

void Widget::paintGL()
{
    glClear(GL_COLOR_BUFFER_BIT);

    const GLfloat quad[8] = {1,1, -1,1, -1,-1, 1,-1};
    _program->enableAttributeArray(PROGRAM_VERTEX_ATTRIBUTE);
    _program->setAttributeArray(PROGRAM_VERTEX_ATTRIBUTE, GL_FLOAT, quad, 2);
    glDrawArrays(GL_QUADS, 0, 4);
    _program->disableAttributeArray(PROGRAM_VERTEX_ATTRIBUTE);
}

#include <QTimerEvent>
void Widget::timerEvent(QTimerEvent *e)
{
    _program->setUniformValue("spheres[0].center", QVector3D(sin(t.elapsed() * 0.0001) * 2.0, 0.2, -3.0));
//    _program->setUniformValue("spheres[0].mat.transparency", (GLfloat)pow(sin(t.elapsed() * 0.00005), 2));
    updateGL();

    _fps++;
    if (e->timerId() == _fpsid) {
        setWindowTitle(QString("raytracer2, fps : %1").arg(_fps));
        _fps = 0;
    }
}

#include <QMouseEvent>
void Widget::mousePressEvent(QMouseEvent *e)
{
    last = e->pos();
}

void Widget::mouseMoveEvent(QMouseEvent *e)
{
    QPoint d = e->pos() - last;
    last = e->pos();
    if (e->buttons() & Qt::LeftButton) {
    angle1 -= d.x() * 0.1;
    angle2 -= d.y() * 0.1;
    }
    QMatrix4x4 m;
    m.rotate(angle1, 0.0, 1.0, 0.0);
    m.rotate(angle2, 1.0, 0.0, 0.0);
    _program->setUniformValue("eye", m * QVector3D(0.0, 0.0, -1.0));
    _program->setUniformValue("up", m * QVector3D(0.0, 1.0, 0.0));
    if (e->buttons() & Qt::RightButton) {
        camera -= d.y() * 0.01 * (m * QVector3D(0.0, 0.0, -1.0));
        _program->setUniformValue("camera", camera);
    }
}

#include <QWheelEvent>
void Widget::wheelEvent(QWheelEvent *e)
{
    zoom *= pow(1.0001, e->delta());
    _program->setUniformValue("anglevalue", zoom);
}
