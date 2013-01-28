#ifndef WIDGET_H
#define WIDGET_H

#include <QGLWidget>
#include <QGLShaderProgram>

#include <QTimeLine>

class Widget : public QGLWidget
{
    Q_OBJECT
    
public:
    Widget(QWidget *parent = 0);
    ~Widget();

private:
    void initializeGL();
    void resizeGL(int w, int h);
    void paintGL();
    void timerEvent(QTimerEvent *);

    QGLShaderProgram *_program;
    GLuint textureId;

    QTimeLine tl;
};

#endif // WIDGET_H
